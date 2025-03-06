#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

function getLatestTag() {
  try {
    const tag = execSync('git describe --tags --abbrev=0').toString().trim();
    return tag === '' ? '0.0.0' : tag;
  } catch (error) {
    return '0.0.0';
  }
}

function getCommitsSinceTag(tag) {
  const format = '%s|%h|%an|%at';
  const command = tag === '0.0.0' 
    ? `git log --pretty=format:"${format}"`
    : `git log ${tag}..HEAD --pretty=format:"${format}"`;

  try {
    return execSync(command)
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(commit => {
        const [message, hash, author, timestamp] = commit.split('|');
        return { message, hash, author, timestamp: new Date(timestamp * 1000) };
      });
  } catch (error) {
    return [];
  }
}

function generateChangelog(commits) {
  const categories = {
    feat: '✨ Features',
    fix: '🐛 Bug Fixes',
    docs: '📚 Documentation',
    style: '💎 Code Style',
    refactor: '♻️ Refactoring',
    perf: '⚡️ Performance',
    test: '🚨 Tests',
    build: '🛠 Build System',
    ci: '⚙️ CI Configuration',
    chore: '📦 Chores',
    revert: '⏪️ Reverts'
  };

  const changes = {};
  Object.values(categories).forEach(cat => changes[cat] = []);
  changes['Other'] = [];

  commits.forEach(commit => {
    const { message, hash, author, timestamp } = commit;
    const match = message.match(/^(\w+)(\(.+\))?:/);
    
    const entry = `- ${message} ([${hash}](https://github.com/zhuzhuyule/sink-extension/commit/${hash})) - ${author}`;
    
    if (match && categories[match[1]]) {
      changes[categories[match[1]]].push(entry);
    } else {
      changes['Other'].push(entry);
    }
  });

  return Object.entries(changes)
    .filter(([_, items]) => items.length > 0)
    .map(([category, items]) => `### ${category}\n\n${items.join('\n')}`)
    .join('\n\n');
}

function updateVersion(type = 'patch') {
  const packagePath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const [major, minor, patch] = pkg.version.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
  }
  
  pkg.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  return newVersion;
}

function createPackages(newVersion) {
  console.log('📦 Creating release packages...');
  try {
    const distDir = path.join(rootDir, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Create ZIP package
    execSync(`cd ${rootDir} && zip -r dist/sink-extension-v${newVersion}.zip . -x "node_modules/*" -x ".git/*" -x "dist/*"`);
    console.log(`✅ ZIP package created: dist/sink-extension-v${newVersion}.zip`);

    // Create CRX package (assuming you have the Chrome extension tools installed)
    try {
      execSync(`cd ${rootDir} && crx pack -o dist/sink-extension-v${newVersion}.crx .`);
      console.log(`✅ CRX package created: dist/sink-extension-v${newVersion}.crx`);
    } catch (error) {
      console.log('⚠️ CRX package creation failed. Make sure you have the Chrome extension tools installed.');
    }
  } catch (error) {
    console.error('❌ Package creation failed:', error.message);
  }
}

function stageChanges(newVersion) {
  try {
    // Stage all files including the new packages
    execSync(`git add --all`);
    console.log('✅ All changes staged');
  } catch (error) {
    console.error('❌ Failed to stage changes:', error.message);
  }
}

function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const versionType = process.argv[2] || 'patch';
  if (!['major', 'minor', 'patch'].includes(versionType)) {
    console.error('Version type must be: major, minor, or patch');
    process.exit(1);
  }

  const currentTag = getLatestTag();
  const commits = getCommitsSinceTag(currentTag);
  const newVersion = updateVersion(versionType);
  
  const date = new Date().toISOString().split('T')[0];
  const changelog = `# ${newVersion} (${date})\n\n${generateChangelog(commits)}`;
  
  // Update CHANGELOG.md
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  const existingChangelog = fs.existsSync(changelogPath) 
    ? fs.readFileSync(changelogPath, 'utf8')
    : '';
  
  fs.writeFileSync(
    changelogPath,
    `${changelog}\n\n${existingChangelog}`.trim() + '\n'
  );
  
  console.log(`✅ Version updated to ${newVersion}`);
  console.log('✅ CHANGELOG.md updated');

  // Ask for confirmation before packaging
  const answer = await promptUser('Do you want to create release packages? (y/n): ');
  
  // Create git tag
  execSync(`git add package.json CHANGELOG.md`);
  
  if (answer.toLowerCase() === 'y') {
    createPackages(newVersion);
    stageChanges(newVersion);
    
    console.log('\n📋 Summary of changes:');
    console.log(`- Version updated to ${newVersion}`);
    console.log('- CHANGELOG.md updated');
    console.log('- Release packages created');
    console.log('- All changes staged');
    console.log('\n✨ Ready for manual commit and push');
  } else {
    console.log('⏭️ Skipping package creation. Changes to package.json and CHANGELOG.md are staged.');
  }

  if (currentTag === '0.0.0') {
    console.log('ℹ️ No existing tags found. This is the initial release.');
  }
}

main(); 

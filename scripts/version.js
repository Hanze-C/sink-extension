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

function stageChanges() {
  try {
    execSync(`git add package.json CHANGELOG.md`);
    console.log('✅ Changes staged (package.json, CHANGELOG.md)');
    return true;
  } catch (error) {
    console.error('❌ Failed to stage changes:', error.message);
    return false;
  }
}

function createAndPushTag(newVersion) {
  try {
    // Create tag
    execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
    console.log(`✅ Tag v${newVersion} created`);
    
    // Push tag
    execSync(`git push origin v${newVersion}`);
    console.log(`✅ Tag v${newVersion} pushed to origin`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create or push tag:', error.message);
    return false;
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
  
  // Preview changelog for user
  console.log('\n📝 Generated changelog:');
  console.log('------------------------');
  console.log(changelog.split('\n').slice(0, 10).join('\n') + (changelog.split('\n').length > 10 ? '\n...(truncated)' : ''));
  console.log('------------------------');
  
  // Ask for confirmation before staging
  const stageAnswer = await promptUser('\nDo you want to stage these changes? (y/n): ');
  
  if (stageAnswer.toLowerCase() !== 'y') {
    console.log('⏭️ Changes not staged. You can review and stage them manually.');
    process.exit(0);
  }
  
  // Stage changes
  if (!stageChanges()) {
    process.exit(1);
  }
  
  console.log('\n📋 Summary of changes:');
  console.log(`- Version updated to ${newVersion}`);
  console.log('- CHANGELOG.md updated');
  console.log('- All changes staged for commit');
  
  // Ask if user wants to proceed with committing and tagging
  const commitMsg = `chore: release ${newVersion}`;
  console.log(`\nReady to commit with message: "${commitMsg}"`);
  const commitAnswer = await promptUser('Do you want to commit these changes and create a tag? (y/n): ');
  
  if (commitAnswer.toLowerCase() === 'y') {
    try {
      // Commit changes
      execSync(`git commit -m "${commitMsg}"`);
      console.log('✅ Changes committed');
      
      // Ask for final confirmation before creating and pushing tag
      console.log(`\nThis will create and push tag v${newVersion}, triggering the release workflow.`);
      const tagAnswer = await promptUser('Continue? (y/n): ');
      
      if (tagAnswer.toLowerCase() === 'y') {
        if (createAndPushTag(newVersion)) {
          console.log('\n🚀 Release process completed!');
          console.log('GitHub Actions will now build and create the release.');
        }
      } else {
        console.log('⏭️ Tag creation skipped. Changes are committed but not tagged.');
      }
    } catch (error) {
      console.error('❌ Commit failed:', error.message);
    }
  } else {
    console.log('⏭️ Commit skipped. Changes are staged and ready for manual commit.');
  }

  if (currentTag === '0.0.0') {
    console.log('\nℹ️ No existing tags found. This is the initial release.');
  }
}

main(); 

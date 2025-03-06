// 创建上下文菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sinkShortUrl',
    title: '生成短链接',
    contexts: ['link'],
  });
});

// 处理上下文菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'sinkShortUrl' && info.linkUrl) {
    chrome.storage.local.set({ pendingUrl: info.linkUrl }, () => {
      chrome.action.openPopup().catch(error => {});
    });
  }
});

console.log('background loaded');

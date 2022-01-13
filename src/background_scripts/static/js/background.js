const Types = { group: '1', unique: '2' };
chrome.runtime.onInstalled.addListener(() => {
	chrome.storage.local.get('blockedPages', (result) => {
		if (!result.blockedPages)
			chrome.storage.local.set({ blockedPages: { type: Types.group, name: null, isRoot: true, childs: [] } }, () => { console.log('Setted root correctly') });
	});
});

function pageInTree(url, root) {
	if (root.type === Types.unique) {
		return url.includes(root.url);
	}
	else if (root.type === Types.group) {
		for (let child of root.childs)
			if (pageInTree(url, child))
				return true;
		return false;
	}
	else {
		console.error('UnexpectedResult: root.type is not known.')
		return false;
	}
}

let blockedPages = {};
chrome.storage.local.get('blockedPages', (result) => {
	blockedPages = result.blockedPages;
});

chrome.storage.onChanged.addListener((changes, namespace) => {
	if (namespace == 'local') {
		for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
			if (key == 'blockedPages') {
				blockedPages = newValue;
			}
		}
	}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
	if (changeInfo.url) {
		let webpage_url = '/blocked.html';
		console.log(changeInfo.url, blockedPages, pageInTree(changeInfo.url, blockedPages));
		if (pageInTree(changeInfo.url, blockedPages)) {
			console.log("Updating");
			chrome.tabs.update(tabId, { url: webpage_url });
		}
	}
});
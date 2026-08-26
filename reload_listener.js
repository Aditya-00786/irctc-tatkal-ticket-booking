chrome.runtime.onMessage.addListener(function(m) {
    if (m.action === "reloadOptions") {
        window.location.reload();
    }
});

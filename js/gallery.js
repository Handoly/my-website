// --- 配置区 ---
const WORKER_URL = "https://image-uploader.handoly666.workers.dev"; // 填入你的 CF Worker 地址

// --- 1. 图片上传逻辑 (自动化增强版) ---
async function uploadImage(file) {
    const status = document.createElement('div'); // 增加一个简单的上传状态提示
    status.style.cssText = "position:fixed; top:10px; right:10px; background:black; color:white; padding:10px; z-index:9999;";
    document.body.appendChild(status);
    
    status.innerText = "⏳ 正在压缩...";
    const baseId = `photo_${Date.now()}`;
    
    // 自动获取文件名作为默认 Alt（去掉后缀）
    const defaultAlt = document.getElementById('alt-input').value; 

    try {
        const rawBlob = await compressImage(file, 1200, 0.7);
        const rawBase64 = await blobToBase64(rawBlob);
        const thumbBlob = await compressImage(file, 300, 0.5);
        const thumbBase64 = await blobToBase64(thumbBlob);

        status.innerText = "🚀 正在上传至 GitHub...";

        await Promise.all([
            sendToWorker(`img/${baseId}.webp`, rawBase64),
            sendToWorker(`img/thumb_${baseId}.webp`, thumbBase64)
        ]);

        const rawUrl = `https://fastly.jsdelivr.net/gh/Handoly/web-site-images@main/img/${baseId}.webp`;
        const thumbUrl = `https://fastly.jsdelivr.net/gh/Handoly/web-site-images@main/img/thumb_${baseId}.webp`;

        // ✨ 自动生成你需要的 HTML 代码
        const generatedHtml = `<a href="#"><img src="${rawUrl}" alt="${defaultAlt}" loading="lazy"></a>`;

        // 填入输入框，方便你一键复制
        const inputField = document.getElementById('post-image');
        inputField.value = generatedHtml;
        inputField.select(); // 自动选中，Ctrl+C 即可
        
        status.innerText = "✅ 上传成功！HTML已生成并选中";
        setTimeout(() => status.remove(), 3000);

        console.log("HTML代码已就绪:", generatedHtml);
    } catch (err) {
        status.innerText = "❌ 失败: " + err.message;
        setTimeout(() => status.remove(), 5000);
    }
}

// --- 工具函数 ---
async function compressImage(file, maxWidth, quality) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => resolve(blob), 'image/webp', quality);
            };
        };
    });
}

function blobToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

async function sendToWorker(fileName, base64) {
    return fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, content: base64 })
    });
}
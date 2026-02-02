// ==================== 1. 配置与初始化 ====================
const SUPABASE_URL = 'https://hatfniprpjrjwzmximna.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_jFyW8ThJemLJHIbzIK085Q_cxmOnNxG';

// 兼容性初始化：确保在不同 CDN 下都能正确加载
const lib = window.supabase || supabase;
const supabaseClient = lib.createClient(SUPABASE_URL, SUPABASE_KEY);

// 总仓库，用来装不同类型的数据
window.dataStorage = {
    notes: [],
    honors: [],
    tips: [],
    daily_logs: []
};

// ==================== 2. 图片压缩核心引擎 ====================
/**
 * 核心：将图片压缩并转为 WebP 格式
 * 极大提升国内访问速度，减小 Supabase 存储压力
 */
async function compressImage(file, maxWidth = 1200, quality = 0.7) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
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
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/webp', quality); 
            };
        };
    });
}

// ==================== 3. UI 交互功能 ====================

function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById("theme-btn");
    body.classList.toggle("dark-mode");
    const isDark = body.classList.contains("dark-mode");
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    btn.innerHTML = isDark ? "☀️" : "🌙";
}

function toggleMenu() {
    document.getElementById("nav-menu").classList.toggle("active");
}

// ==================== 4. 留言与想法功能 ====================

async function loadComments() {
    const container = document.getElementById("comments-container");
    const { data, error } = await supabaseClient
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return;

    const isAdmin = document.getElementById('admin-panel').style.display === 'block' || 
                    localStorage.getItem('keep_admin_open') === 'true';

    if (data.length === 0) {
        container.innerHTML = '<p class="empty-hint">暂无留言，快来抢沙发！</p>';
        return;
    }

    container.innerHTML = data.map(comment => `
        <div class="comment-card">
            ${isAdmin ? `<button class="delete-btn" onclick="deleteComment('${comment.id}')">×</button>` : ''}
            <div class="comment-header">
                <strong>${comment.username}</strong>
                <span class="location-tag">📍 ${comment.location || '中国'}</span>
            </div>
            <p class="comment-content">${comment.content}</p>
            <div class="comment-footer"><small>${new Date(comment.created_at).toLocaleString('zh-CN', { hour12: false })}</small></div>
        </div>
    `).join('');
}

async function addComment() {
    const nameInput = document.getElementById("name-input");
    const contentInput = document.getElementById("content-input");
    const submitBtn = document.querySelector('button[type="submit"]');
    const username = nameInput.value.trim();
    const content = contentInput.value.trim();

    if (!username || !content) { alert("名字和内容都要写哦！"); return; }

    submitBtn.disabled = true;
    submitBtn.innerText = "正在发送...";

    try {
        localStorage.setItem('saved_username', username);
        const { error } = await supabaseClient
            .from('comments')
            .insert([{ username, content, location: "来自地球" }]);
        if (!error) contentInput.value = "";
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "发送";
    }
}

async function deleteComment(id) {
    if (!confirm("确定删除这条留言吗？")) return;
    const { error } = await supabaseClient.from('comments').delete().eq('id', id);
    if (!error) loadComments();
}

async function loadThoughts() {
    const container = document.getElementById("thoughts-container");
    const { data, error } = await supabaseClient.from('thoughts').select('*').order('created_at', { ascending: false });

    if (!error && data) {
        container.innerHTML = data.map(t => `
            <div class="thought-item">
                ${t.content} <br>
                <small style="color: #999; font-size: 11px;">${new Date(t.created_at).toLocaleString()}</small>
            </div>
        `).join('');
    }
}

async function addThought() {
    const input = document.getElementById("thought-input");
    const content = input.value.trim();
    if (!content) return;
    const { error } = await supabaseClient.from('thoughts').insert([{ content }]);
    if (!error) { input.value = ""; loadThoughts(); }
}

// ==================== 5. 内容展示 (笔记/日常/荣誉) ====================

async function loadNotes(category = 'all') {
    const grid = document.getElementById("notes-grid");
    let query = supabaseClient.from('notes').select('*').order('created_at', { ascending: false });
    if (category !== 'all') query = query.eq('category', category);

    const { data, error } = await query;
    if (error) return;

    // 🚀 第一处修改：将获取到的所有数据存入全局变量
    // 这样 handleCardClick 就能通过 ID 在内存里找到完整对象
    window.dataStorage.notes = data; 

    grid.innerHTML = data.map(note => `
        <div class="note-card" onclick="handleCardClick('${note.id}', 'notes')">
            <img src="${note.image_url || 'https://via.placeholder.com/150?text=No+Image'}" loading="lazy" alt="预览">
            <div class="note-info">
                <span class="note-category">${note.category}</span>
                <h5>${note.title}</h5>
            </div>
        </div>
    `).join('');
}

async function loadDailyLogs() {
    const grid = document.getElementById("daily-grid");
    const { data, error } = await supabaseClient.from('daily_logs').select('*').order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">今天还没发生什么新鲜事呢~</p>';
        return;
    }

    window.dataStorage.daily_logs = data; // 存入全局变量

    grid.innerHTML = data.map(log => `
        <div class="note-card" onclick="handleCardClick('${log.id}', 'daily_logs')">
            <img src="${log.image_url || 'https://via.placeholder.com/150?text=Daily'}" loading="lazy" alt="日常">
            <div class="note-info">
                <span class="note-tag" style="background:#50fa7b; color:#282a36;">${new Date(log.created_at).toLocaleDateString()}</span>
                <h5>${log.title}</h5>
            </div>
        </div>
    `).join('');
}

async function loadTips() {
    const grid = document.getElementById("tips-grid");
    // 假设你在 Supabase 中新建了一个名为 'tips' 的数据表，或者复用 notes 表
    // 这里我们按照你 HTML 的逻辑，从 'tips' 表读取
    const { data, error } = await supabaseClient.from('tips').select('*').order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">暂时没有小知识分享~</p>';
        return;
    }

    window.dataStorage.tips = data; // 存入全局变量

    grid.innerHTML = data.map(tip => `
        <div class="note-card" onclick="handleCardClick('${tip.id}', 'tips')">
            <img src="${tip.image_url || 'https://via.placeholder.com/150?text=Tips'}" loading="lazy" alt="小知识">
            <div class="note-info">
                <span class="note-tag" style="background:#8be9fd; color:#282a36;">💡 知识点</span>
                <h5>${tip.title}</h5>
            </div>
        </div>
    `).join('');
}

async function loadHonors() {
    const grid = document.getElementById("honors-grid");
    const { data, error } = await supabaseClient.from('honors').select('*').order('award_date', { ascending: false });
    if (error || !data) return;

    window.dataStorage.honors = data; // 存入全局变量

    grid.innerHTML = data.map(honor => `
        <div class="honor-medal" onclick="handleCardClick('${honor.id}', 'honors')">
            <img src="${honor.image_url || 'default-icon.png'}" title="${honor.title}" loading="lazy">
        </div>
    `).join('');
}

// ==================== 6. 详情页处理 ====================

function openNote(note) {
    const modal = document.getElementById('note-modal');
    const body = document.getElementById('modal-body');
    let displayContent = note.content || '暂无详细描述';
    
    // 荣誉模板动态渲染
    if (note.issuer || note.award_date) {
        displayContent = `### 🏆 ${note.title}\n**颁发机构：** ${note.issuer || '未知'}\n**获奖日期：** ${note.award_date || '未记录'}\n---\n${note.content || '暂无详细描述'}`;
    }

    const renderedContent = marked.parse(displayContent, { breaks: true });

    body.innerHTML = `
        <div class="modal-image-container" style="background: #f0f0f0; min-height: 200px; overflow-y: auto; max-height: 400px;">
            <img src="${note.image_url}" class="modal-detail-img" style="width: 100%; height: auto;" onclick="openImageViewer(this.src)">
        </div>
        <div class="modal-info-content">
            <span class="note-tag">${note.category || '内容'}</span>
            <h2 class="modal-detail-title">${note.title}</h2>
            <div class="modal-detail-text markdown-body">${renderedContent}</div>
        </div>
    `;

    // 绑定正文图片点击放大
    setTimeout(() => {
        body.querySelectorAll('.modal-detail-text img').forEach(img => {
            img.onclick = () => openImageViewer(img.src);
        });
    }, 100);

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function handleOverlayClick(event) {
    // 只有点击的是 overlay 本身（背景），而不是它里面的子元素时，才关闭
    if (event.target.classList.contains('modal-overlay')) {
        closeNote();
    }
}

function closeNote() {
    document.getElementById('note-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openImageViewer(src) {
    const viewer = document.getElementById('image-viewer');
    document.getElementById('full-image').src = src;
    viewer.style.display = 'flex';
}

function closeImageViewer() {
    document.getElementById('image-viewer').style.display = 'none';
}

// ==================== 7. 内容发布与上传 (含压缩逻辑) ====================

async function uploadToStorage() {
    const fileInput = document.getElementById('file-upload');
    const status = document.getElementById('upload-status');
    const urlInput = document.getElementById('post-image');
    const postType = document.getElementById('post-type').value;

    const bucketMap = { 
        'notes': 'notes-images', 
        'daily_logs': 'dailylog', 
        'honors': 'honors',
        'tips': 'tips'
    };
    const targetBucket = bucketMap[postType];

    if (fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    status.innerText = "正在压缩并上传...";

    // 🚀 压缩并转换为 WebP
    let uploadData = file;
    let fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.webp`;

    if (file.type.startsWith('image/')) {
        uploadData = await compressImage(file, 1200, 0.7);
    }

    const { data, error } = await supabaseClient.storage
        .from(targetBucket)
        .upload(fileName, uploadData, { contentType: 'image/webp' });

    if (error) { status.innerText = "❌ 上传失败"; return; }

    const { data: publicData } = supabaseClient.storage.from(targetBucket).getPublicUrl(fileName);
    urlInput.value = publicData.publicUrl;
    status.innerText = `✅ 成功 (${(uploadData.size / 1024).toFixed(1)}KB)`;
}

async function uploadToContent() {
    const fileInput = document.getElementById('content-img-upload');
    const textArea = document.getElementById('post-content');
    const status = document.getElementById('content-upload-status');
    const postType = document.getElementById('post-type').value;

    const bucketMap = { 
        'notes': 'notes-images', 
        'daily_logs': 'dailylog', 
        'honors': 'honors',
        'tips': 'tips'
    };
    const targetBucket = bucketMap[postType];

    if (fileInput.files.length === 0) return;
    status.innerText = "压缩插图...";

    const file = fileInput.files[0];
    const uploadData = await compressImage(file, 1000, 0.6);
    const fileName = `content-${Date.now()}.webp`;

    const { data, error } = await supabaseClient.storage.from(targetBucket).upload(fileName, uploadData, { contentType: 'image/webp' });
    if (error) return alert("上传失败");

    const { data: { publicUrl } } = supabaseClient.storage.from(targetBucket).getPublicUrl(fileName);
    const startPos = textArea.selectionStart;
    const markdownImg = `\n![描述](${publicUrl})\n`;
    textArea.value = textArea.value.substring(0, startPos) + markdownImg + textArea.value.substring(textArea.selectionEnd);
    status.innerText = "✅ 已插入";
}

async function submitPost() {
    const editId = document.getElementById('edit-id').value;
    const type = document.getElementById('post-type').value;
    const btn = document.getElementById('submit-btn');
    
    let title = document.getElementById('post-title').value.trim();
    let image_url = document.getElementById('post-image').value.trim();
    let content = document.getElementById('post-content').value.trim();

    if (!title) { alert("标题不能为空！"); return; }
    btn.disabled = true;

    const postData = { title, image_url, content };
    if (type === 'notes') postData.category = document.getElementById('post-category').value || '未分类';
    if (type === 'honors') {
        postData.issuer = document.getElementById('post-issuer').value.trim();
        postData.award_date = document.getElementById('post-date').value;
    }

    const { error } = editId 
        ? await supabaseClient.from(type).update(postData).eq('id', editId)
        : await supabaseClient.from(type).insert([postData]);

    if (error) alert("操作失败");
    else { localStorage.setItem('keep_admin_open', 'true'); location.reload(); }
}

// ==================== 8. 管理逻辑 ====================

function handleCardClick(id, type) {
    // 🚀 从仓库里根据 ID 找到对应的那条数据
    const data = window.dataStorage[type].find(item => item.id === id);
    
    if (!data) return; // 防护：万一没找到

    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel && adminPanel.style.display !== 'none') {
        if (confirm(`📝 编辑“${data.title}”？`)) editPost(data, type);
    } else {
        openNote(data); // 这里的 data 依然是完整的对象，openNote 函数不用动
    }
}

function editPost(data, type) {
    document.getElementById('admin-panel').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('admin-title').innerText = "📝 正在修改内容";
    document.getElementById('submit-btn').innerText = "保存修改";
    document.getElementById('delete-btn').style.display = "block";
    document.getElementById('cancel-btn').style.display = "block";
    document.getElementById('edit-id').value = data.id;
    document.getElementById('post-type').value = type;
    document.getElementById('post-title').value = data.title;
    document.getElementById('post-image').value = data.image_url;
    document.getElementById('post-content').value = data.content;
    toggleFields();
    if (type === 'notes') document.getElementById('post-category').value = data.category || "";
    if (type === 'honors') {
        document.getElementById('post-issuer').value = data.issuer || "";
        document.getElementById('post-date').value = data.award_date || "";
    }
}

async function deletePost() {
    const id = document.getElementById('edit-id').value;
    const type = document.getElementById('post-type').value;
    if (!id || !confirm("确定要永久删除吗？")) return;
    await supabaseClient.from(type).delete().eq('id', id);
    localStorage.setItem('keep_admin_open', 'true');
    location.reload();
}

function logoutAdmin() {
    if (confirm("退出管理模式？")) {
        localStorage.removeItem('keep_admin_open');
        location.reload();
    }
}

function toggleFields() {
    const type = document.getElementById('post-type').value;
    document.getElementById('honor-fields').style.display = (type === 'honors') ? 'block' : 'none';
    // 让 tips 和 notes 共用分类输入框
    document.getElementById('note-fields').style.display = (type === 'notes' || type === 'tips') ? 'block' : 'none';
}

// 2. 切换分类点击处理器
function filterNotes(cat) {
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.classList.remove('active');
        if(tag.innerText === cat || (cat === 'all' && tag.innerText === '全部')) tag.classList.add('active');
    });
    loadNotes(cat);
}

// ==================== 9. 初始化启动 ====================

window.onload = async () => {
    // 恢复主题
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add("dark-mode");
        document.getElementById("theme-btn").innerHTML = "☀️";
    }

    // 恢复后台状态
    if (localStorage.getItem('keep_admin_open') === 'true') {
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('thought-section').style.display = 'block';
        loadThoughts();
    }

    const nameInput = document.getElementById("name-input");
    if (nameInput) {
        nameInput.value = localStorage.getItem('saved_username') || "";
        nameInput.addEventListener('input', (e) => {
            if (e.target.value.trim() === "admin") {
                document.getElementById('admin-panel').style.display = 'block';
                document.getElementById('thought-section').style.display = 'block';
                loadThoughts();
                loadComments();
                e.target.value = "";
                alert("🔓 管理员模式已开启");
            }
        });
    }

    await Promise.all([loadComments(), loadNotes(), loadDailyLogs(), loadHonors(), loadTips()]);
    
    // 实时更新留言
    supabaseClient.channel('comments').on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => loadComments()).subscribe();

    const loader = document.getElementById('loading-screen');
    if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 500); }
}; 
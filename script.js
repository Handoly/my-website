// ==================== 1. 配置与初始化 ====================
const SUPABASE_URL = 'https://hatfniprpjrjwzmximna.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_jFyW8ThJemLJHIbzIK085Q_cxmOnNxG';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== 2. UI 交互功能 ====================

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

// ==================== 3. 核心功能函数 ====================

// 获取并渲染留言列表
async function loadComments() {
    const container = document.getElementById("comments-container");
    const { data, error } = await supabaseClient
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return;

    container.innerHTML = "";
    if (data && data.length > 0) {
        data.forEach(item => {
            const time = new Date(item.created_at).toLocaleString('zh-CN', { hour12: false });
            const card = document.createElement("div");
            card.className = "comment-card";
            card.innerHTML = `
                <button class="delete-btn" onclick="deleteComment('${item.id}')">×</button>
                <div class="comment-header">
                    <strong>${item.username}</strong>
                    <span class="location-tag">📍 ${item.location || '未知'}</span>
                </div>
                <p style="margin: 8px 0;">${item.content}</p>
                <div class="comment-footer"><small>${time}</small></div>
            `;
            container.appendChild(card);
        });
    } else {
        container.innerHTML = '<p class="empty-hint">暂无留言，快来抢沙发！</p>';
    }
}

// 发送留言
async function addComment() {
    const nameInput = document.getElementById("name-input");
    const contentInput = document.getElementById("content-input");
    const submitBtn = document.querySelector('button[type="submit"]');

    const username = nameInput.value.trim();
    const content = contentInput.value.trim();

    if (!username || !content) {
        alert("名字和内容都要写哦！");
        return;
    }

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

// 删除留言
async function deleteComment(id) {
    if (!confirm("确定删除吗？")) return;
    await supabaseClient.from('comments').delete().eq('id', id);
}

// 加载私密想法
async function loadThoughts() {
    const container = document.getElementById("thoughts-container");
    const { data, error } = await supabaseClient
        .from('thoughts')
        .select('*')
        .order('created_at', { ascending: false });

    if (!error && data) {
        container.innerHTML = data.map(t => `
            <div class="thought-item">
                ${t.content} <br>
                <small style="color: #999; font-size: 11px;">${new Date(t.created_at).toLocaleString()}</small>
            </div>
        `).join('');
    }
}

// 发送想法
async function addThought() {
    const input = document.getElementById("thought-input");
    const content = input.value.trim();
    if (!content) return;

    const { error } = await supabaseClient
        .from('thoughts')
        .insert([{ content }]);

    if (!error) {
        input.value = "";
        loadThoughts();
    }
}

// 获取并渲染笔记
async function loadNotes(category = 'all') {
    const grid = document.getElementById("notes-grid");
    let query = supabaseClient.from('notes').select('*').order('created_at', { ascending: false });
    
    // 如果不是 'all'，就按分类过滤
    if (category !== 'all') {
        query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) return;

    grid.innerHTML = data.map(note => `
        <div class="note-card" onclick='openNote(${JSON.stringify(note)})'>
            <img src="${note.image_url || 'https://via.placeholder.com/150?text=No+Image'}" alt="预览">
            <div class="note-info">
                <span class="note-category">${note.category}</span>
                <h5>${note.title}</h5>
            </div>
        </div>
    `).join('');
}

// 切换分类的高亮效果
function filterNotes(cat) {
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.classList.remove('active');
        if(tag.innerText === cat || (cat === 'all' && tag.innerText === '全部')) tag.classList.add('active');
    });
    loadNotes(cat);
}

function showNoteDetail(title, content) {
    alert("【" + title + "】\n\n" + content);
}

// 打开详情
function openNote(note) {
    const modal = document.getElementById('note-modal');
    const body = document.getElementById('modal-body');
    
    // 🚀 核心：使用 marked 解析 markdown 内容
    // 增加 breaks: true 可以让你的回车换行直接生效
    const renderedContent = marked.parse(note.content || '暂无详细记录...', {
        breaks: true,
        gfm: true
    });

    body.innerHTML = `
        <div class="modal-image-container">
            <img src="${note.image_url}" class="modal-detail-img" onclick="openImageViewer(this.src)">
        </div>
        <div class="modal-info-content">
            <span class="note-tag">${note.category}</span>
            <h2 class="modal-detail-title">${note.title}</h2>
            <hr style="border: 0; border-top: 1px dashed var(--input-border); margin: 15px 0;">
            <div class="modal-detail-text markdown-body">${renderedContent}</div>
        </div>
    `;
    
    // 🚀 额外动作：给 markdown 里的图片自动加上点击放大功能
    setTimeout(() => {
        const images = body.querySelectorAll('.modal-detail-text img');
        images.forEach(img => {
            img.onclick = () => openImageViewer(img.src);
            img.style.cursor = 'zoom-in';
            img.classList.add('content-inline-img'); // 复用之前的样式
        });
    }, 50);

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// 关闭详情
function closeNote() {
    document.getElementById('note-modal').style.display = 'none';
    document.body.style.overflow = 'auto'; // 恢复背景滚动
}

// 点击遮罩层也可以关闭
window.onclick = (event) => {
    const modal = document.getElementById('note-modal');
    if (event.target == modal) closeNote();
}

// 1. 打开全屏预览
function openImageViewer(src) {
    const viewer = document.getElementById('image-viewer');
    const fullImg = document.getElementById('full-image');
    fullImg.src = src;
    viewer.style.display = 'flex';
    // 隐藏详情框滚动条
    document.body.style.overflow = 'hidden'; 
}

// 2. 关闭全屏预览
function closeImageViewer() {
    document.getElementById('image-viewer').style.display = 'none';
    // 如果详情框还在，保持 body 锁定；如果不在则恢复
    if (document.getElementById('note-modal').style.display === 'none') {
        document.body.style.overflow = 'auto';
    }
}

// 1. 加载日常记录
async function loadDailyLogs() {
    const grid = document.getElementById("daily-grid");
    
    const { data, error } = await supabaseClient
        .from('daily_logs')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("加载日常失败:", error);
        return;
    }

    if (!data || data.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">今天还没发生什么新鲜事呢~</p>';
        return;
    }

    grid.innerHTML = data.map(log => {
        // 格式化日期：显示为 2024-05-20
        const date = new Date(log.created_at).toLocaleDateString();
        
        return `
            <div class="note-card" onclick='openNote(${JSON.stringify(log)})'>
                <img src="${log.image_url || 'https://via.placeholder.com/150?text=Daily'}" alt="日常图片">
                <div class="note-info">
                    <span class="note-tag" style="background:#50fa7b; color:#282a36;">${date}</span>
                    <h5>${log.title}</h5>
                </div>
            </div>
        `;
    }).join('');
}

// 加载个人荣誉
async function loadHonors() {
    const grid = document.getElementById("honors-grid");
    const { data, error } = await supabaseClient
        .from('honors')
        .select('*')
        .order('award_date', { ascending: false });

    if (error || !data) return;

    grid.innerHTML = data.map(honor => {
        // 构建详情页展示的 Markdown
        const enhancedContent = `
### 🏆 ${honor.title}
**颁发机构：** ${honor.issuer || '未知'}
**获奖日期：** ${honor.award_date || '未记录'}

---
${honor.content || '暂无详细描述'}
        `;

        const detailObject = { ...honor, content: enhancedContent };

        return `
            <div class="honor-medal" onclick='openNote(${JSON.stringify(detailObject)})'>
                <img src="${honor.image_url || 'https://via.placeholder.com/80?text=Honor'}" title="${honor.title}">
            </div>
        `;
    }).join('');
}

// 1. 切换不同类型的输入框
function toggleFields() {
    const type = document.getElementById('post-type').value;
    document.getElementById('honor-fields').style.display = (type === 'honors') ? 'block' : 'none';
    document.getElementById('note-fields').style.display = (type === 'notes') ? 'block' : 'none';
}

// 2. 提交数据到 Supabase
async function submitPost() {
    const type = document.getElementById('post-type').value;
    const btn = document.getElementById('submit-btn');
    
    // 获取基础数据
    const postData = {
        title: document.getElementById('post-title').value.trim(),
        image_url: document.getElementById('post-image').value.trim(),
        content: document.getElementById('post-content').value.trim()
    };

    if (!postData.title) {
        alert("标题不能为空哦！");
        return;
    }

    btn.disabled = true;
    btn.innerText = "发布中...";

    // 根据类型补充特定字段
    if (type === 'notes') {
        postData.category = document.getElementById('post-category').value || '未分类';
    } else if (type === 'honors') {
        postData.issuer = document.getElementById('post-issuer').value;
        postData.award_date = document.getElementById('post-date').value;
    } else if (type === 'daily_logs') {
        postData.category = '日常';
    }

    const { error } = await supabaseClient.from(type).insert([postData]);

    if (error) {
        alert("发布失败：" + error.message);
    } else {
        alert("🚀 发布成功！页面即将刷新。");
        location.reload(); // 刷新页面查看新内容
    }
    btn.disabled = false;
    btn.innerText = "立即发布";
}

async function uploadToStorage() {
    const fileInput = document.getElementById('file-upload');
    const status = document.getElementById('upload-status');
    const urlInput = document.getElementById('post-image');
    
    // 🚀 获取当前选择的发布类型
    const postType = document.getElementById('post-type').value;

    // 🚀 建立类型与存储桶(Bucket)的对应关系
    const bucketMap = {
        'notes': 'notes-images',
        'daily_logs': 'dailylog',
        'honors': 'honors'
    };

    const targetBucket = bucketMap[postType];

    if (fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`; // 存放在桶的根目录即可

    status.innerText = `🚀 正在上传至 ${targetBucket}...`;

    // 1. 执行上传到对应的存储桶
    const { data, error } = await supabaseClient.storage
        .from(targetBucket)
        .upload(filePath, file);

    if (error) {
        console.error("上传失败:", error.message);
        status.innerText = "❌ 上传失败，请检查该桶的 Public 权限及 Policy";
        return;
    }

    // 2. 获取该桶下的公共访问链接
    const { data: publicData } = supabaseClient.storage
        .from(targetBucket)
        .getPublicUrl(filePath);

    const publicUrl = publicData.publicUrl;

    // 3. 填入输入框
    urlInput.value = publicUrl;
    status.innerText = `✅ 已成功存入 ${targetBucket}`;
}

async function uploadToContent() {
    const fileInput = document.getElementById('content-img-upload');
    const textArea = document.getElementById('post-content');
    const status = document.getElementById('content-upload-status');
    const postType = document.getElementById('post-type').value;

    const bucketMap = { 'notes': 'notes-images', 'daily_logs': 'dailylog', 'honors': 'honors' };
    const targetBucket = bucketMap[postType];

    if (fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    const fileName = `content-${Date.now()}.${file.name.split('.').pop()}`;

    status.innerText = "正在上传...";

    const { data, error } = await supabaseClient.storage.from(targetBucket).upload(fileName, file);
    if (error) return alert("上传失败");

    const { data: { publicUrl } } = supabaseClient.storage.from(targetBucket).getPublicUrl(fileName);

    // 🚀 核心：在光标位置插入 Markdown 语法
    const startPos = textArea.selectionStart;
    const endPos = textArea.selectionEnd;
    const markdownImg = `\n![图片描述](${publicUrl})\n`;
    
    textArea.value = textArea.value.substring(0, startPos) + markdownImg + textArea.value.substring(endPos);
    status.innerText = "✅ 已插入";
}

// ==================== 4. 页面启动器 (唯一的入口) ====================
window.onload = async () => {
    // 恢复夜间模式
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add("dark-mode");
        document.getElementById("theme-btn").innerHTML = "☀️";
    }

    // 恢复用户名
    const nameInput = document.getElementById("name-input");
    const savedName = localStorage.getItem('saved_username');
    if (savedName && nameInput) nameInput.value = savedName;

    // 🚀 核心解锁逻辑：监听名字输入框
    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            const code = e.target.value.trim();
            if (code === "admin") { // 这里就是你的暗号
                const section = document.getElementById('thought-section');
                
                // 1. 先解锁显示
                section.style.display = 'block';
                document.getElementById('admin-panel').style.display = 'block';
                loadThoughts();
                
                // 2. 清空暗号并弹窗
                e.target.value = ""; 
                alert("🔒 邓万穿的私密空间已解锁！");

                // 3. 🚀 关键优化：给浏览器 300 毫秒的时间去“画”出这个板块
                // 然后再执行平滑滚动
                setTimeout(() => {
                    // 使用 offsetTop 这种更硬核的方式定位
                    const topPos = section.offsetTop - 70; // 减去 70 是为了避开顶部导航栏
                    window.scrollTo({
                        top: topPos,
                        behavior: 'smooth'
                    });
                }, 300);
            }
        });
    }

    // 加载数据
    await loadComments();
    await loadNotes();
    await loadDailyLogs();
    await loadHonors();

    // 实时监听
    supabaseClient.channel('public-comments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => loadComments())
        .subscribe();

    // 关闭加载遮罩
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }
};
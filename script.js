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

    // 🚀 核心逻辑：判断当前是否是管理模式
    const isAdmin = document.getElementById('admin-panel').style.display === 'block' || 
                    localStorage.getItem('keep_admin_open') === 'true';

    if (data.length === 0) {
        container.innerHTML = '<p class="empty-hint">暂无留言，快来抢沙发！</p>';
        return;
    }
    container.innerHTML = "";
    container.innerHTML = data.map(comment => `
        ${isAdmin ? `
            <button class="delete-btn" onclick="deleteComment('${comment.id}')">×</button>
            ` : ''}
        <div class="comment-card">
            <div class="comment-header">
                <strong>${comment.username}</strong>
                <span class="location-tag">📍 ${comment.location || '中国'}</span>
            </div>
            <p class="comment-content">${comment.content}</p>
            <div class="comment-footer"><small>${new Date(comment.created_at).toLocaleString('zh-CN', { hour12: false })}</small></div>
        </div>
    `).join('');
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
        <div class="note-card" onclick='handleCardClick(${JSON.stringify(note)}, "notes")'>
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

    // 🚀 只有在展示荣誉详情时，才即时生成装饰性的 Markdown
    let displayContent = note.content || '暂无详细描述';
    
    // 如果是荣誉类型，我们在展示时动态套用模板
    if (note.issuer || note.award_date) {
        displayContent = `### 🏆 ${note.title}
**颁发机构：** ${note.issuer || '未知'}
**获奖日期：** ${note.award_date || '未记录'}
---
${note.content || '暂无详细描述'}`;
    }

    const renderedContent = marked.parse(displayContent, { breaks: true });

    body.innerHTML = `
        <div class="modal-image-container">
            <img src="${note.image_url}" class="modal-detail-img" onclick="openImageViewer(this.src)">
        </div>
        <div class="modal-info-content">
            <span class="note-tag">${note.category || '荣誉'}</span>
            <h2 class="modal-detail-title">${note.title}</h2>
            <div class="modal-detail-text markdown-body">${renderedContent}</div>
        </div>
    `;

    // 🚀 核心：为正文里渲染出来的图片也绑定点击放大功能
    setTimeout(() => {
        const contentImages = body.querySelectorAll('.modal-detail-text img');
        contentImages.forEach(img => {
            img.onclick = () => openImageViewer(img.src);
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
            <div class="note-card" onclick='handleCardClick(${JSON.stringify(log)}, "daily_logs")'>
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
        // 🚀 修复点：不再在这里拼接 enhancedContent
        // 直接把原始数据 honor 传给点击函数
        return `
            <div class="honor-medal" onclick='handleCardClick(${JSON.stringify(honor)}, "honors")'>
            <img src="${honor.image_url || 'default-icon.png'}" title="${honor.title}" loading="lazy" alt="荣誉勋章">
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
    const editId = document.getElementById('edit-id').value;
    const type = document.getElementById('post-type').value;
    const btn = document.getElementById('submit-btn');
    
    // 获取基础数据
    let title = document.getElementById('post-title').value.trim();
    let image_url = document.getElementById('post-image').value.trim();
    let content = document.getElementById('post-content').value.trim();

    if (!title) {
        alert("标题不能为空哦！");
        return;
    }

    btn.disabled = true;
    btn.innerText = editId ? "正在保存修改..." : "正在发布...";

    // 准备要提交的数据对象
    const postData = { title, image_url, content };

    // 🏆 针对不同类型补充特定字段，并处理荣誉内容的自动排版
    if (type === 'notes') {
        postData.category = document.getElementById('post-category').value || '未分类';
    } else if (type === 'honors') {
        postData.issuer = document.getElementById('post-issuer').value.trim();
        postData.award_date = document.getElementById('post-date').value;
        // 🚀 这里再也不需要写 postData.content = `### ...` 了！
    }

    try {
        let result;
        if (editId) {
            // 执行更新
            result = await supabaseClient
                .from(type)
                .update(postData)
                .eq('id', editId);
        } else {
            // 执行新增
            result = await supabaseClient
                .from(type)
                .insert([postData]);
        }

        if (result.error) throw result.error;

        alert(editId ? "✅ 内容已成功修改！" : "🚀 新内容发布成功！");
        
        // 🚀 状态保持：刷新后依然保持后台开启
        localStorage.setItem('keep_admin_open', 'true');
        location.reload(); 

    } catch (err) {
        console.error("操作失败:", err);
        alert("出错啦：" + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "立即发布";
    }
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

// 1. 删除功能
async function deletePost() {
    const id = document.getElementById('edit-id').value;
    const type = document.getElementById('post-type').value;
    const btn = document.getElementById('delete-btn');

    if (!id) {
        alert("找不到要删除的 ID，请先点击下方的卡片进入编辑模式。");
        return;
    }

    if (confirm("⚠️ 确定要永久删除这条记录吗？此操作不可撤销。")) {
        btn.disabled = true;
        btn.innerText = "正在执行删除...";

        try {
            // 🚀 执行删除
            const { error } = await supabaseClient
                .from(type)
                .delete()
                .eq('id', id);

            if (error) {
                console.error("删除出错:", error);
                alert("删除失败：" + error.message + "\n请检查数据库 RLS Policy 是否开启了 DELETE 权限。");
            } else {
                alert("🗑️ 删除成功！");
                // 🚀 关键：告诉浏览器刷新后不要关后台
                localStorage.setItem('keep_admin_open', 'true');
                location.reload(); // 强制刷新页面
            }
        } catch (err) {
            alert("发生意外错误：" + err.message);
        } finally {
            // 无论成功失败，必须恢复按钮状态，防止死锁
            btn.disabled = false;
            btn.innerText = "删除此条内容";
        }
    }
}

// 2. 取消编辑功能 (重置表单)
function cancelEdit() {
    document.getElementById('edit-id').value = "";
    document.getElementById('admin-title').innerText = "🛠️ 内容发布后台";
    document.getElementById('submit-btn').innerText = "立即发布";
    
    // 隐藏删除和取消按钮
    document.getElementById('delete-btn').style.display = "none";
    document.getElementById('cancel-btn').style.display = "none";
    
    // 清空输入框
    document.getElementById('post-title').value = "";
    document.getElementById('post-image').value = "";
    document.getElementById('post-content').value = "";
    document.getElementById('post-category').value = "";
    document.getElementById('post-issuer').value = "";
    document.getElementById('post-date').value = "";
    
    // 重置文件上传状态
    document.getElementById('upload-status').innerText = "";
}

// 3. 修改进入编辑模式的逻辑 (需配合之前的 handleCardClick)
function editPost(data, type) {
    // 1. 平滑滚动到页面顶部的后台区域
    document.getElementById('admin-panel').scrollIntoView({ behavior: 'smooth' });

    // 2. 更新后台界面状态
    document.getElementById('admin-title').innerText = "📝 正在修改内容";
    document.getElementById('submit-btn').innerText = "保存修改";
    document.getElementById('delete-btn').style.display = "block";
    document.getElementById('cancel-btn').style.display = "block";

    // 3. 填充基础字段
    document.getElementById('edit-id').value = data.id;
    document.getElementById('post-type').value = type; // 自动切换下拉菜单
    document.getElementById('post-title').value = data.title;
    document.getElementById('post-image').value = data.image_url;
    document.getElementById('post-content').value = data.content;

    // 4. 处理不同类型的特有字段
    toggleFields(); // 先触发一次字段切换显示
    
    if (type === 'notes') {
        document.getElementById('post-category').value = data.category || "";
    } else if (type === 'honors') {
        document.getElementById('post-issuer').value = data.issuer || "";
        document.getElementById('post-date').value = data.award_date || "";
    }
}

function handleCardClick(data, type) {
    const adminPanel = document.getElementById('admin-panel');
    
    // 🚀 如果后台面板是展开状态，说明处于“管理模式”
    if (adminPanel && adminPanel.style.display !== 'none') {
        // 弹出确认，防止误触进入编辑
        if (confirm(`📝 要编辑这条“${data.title}”的内容吗？`)) {
            editPost(data, type);
        }
    } else {
        // 🚀 否则就是普通用户模式，直接预览
        openNote(data);
    }
}

function logoutAdmin() {
    if (confirm("确定要退出管理模式并刷新页面吗？")) {
        // 1. 清除标记，这样刷新后就不会再开了
        localStorage.removeItem('keep_admin_open');
        
        // 2. 隐藏面板（虽然刷新会自动隐藏，但这样体验更好）
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('thought-section').style.display = 'none';
        
        // 3. 刷新页面恢复普通用户视图
        location.reload();
    }
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

    // 2. 🚀 检查是否需要自动维持后台状态
    if (localStorage.getItem('keep_admin_open') === 'true') {
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('thought-section').style.display = 'block';
        loadThoughts();
        // 注意：这里不要删除标记，因为用户可能还要继续连着发
    }

    // 🚀 核心解锁逻辑：监听名字输入框
    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            const code = e.target.value.trim();
            if (code === "admin") { // 这里就是你的暗号
                
                // 1. 先解锁显示
                document.getElementById('thought-section').style.display = 'block';
                document.getElementById('admin-panel').style.display = 'block';
                loadThoughts();
                loadComments();
                
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
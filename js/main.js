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

function handleCardClick(id, type) {
    // 🚀 从仓库里根据 ID 找到对应的那条数据
    const data = window.dataStorage[type].find(item => item.id === id);
    
    if (!data) return; // 防护：万一没找到
 
    const isAdmin = document.getElementById('admin-panel').style.display === 'block';
    if (isAdmin) {
        if (confirm(`📝 编辑“${data.title}”？`)) {
            editPost(data, type);
        } else if (confirm(`🤓 查看“${data.title}”？`)) {
            openNote(data); 
        }
    } else {
        openNote(data); // 这里的 data 依然是完整的对象，openNote 函数不用动
    }
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

async function loadNotes(category = 'all') {
    const grid = document.getElementById("notes-grid");
    let query = supabaseClient.from('notes').select('*').order('created_at', { ascending: false });
    if (category !== 'all') query = query.eq('category', category);

    const { data, error } = await query;
    if (error) return;

    window.dataStorage.notes = data; 

    grid.innerHTML = data.map(note => `
        <div class="note-card" onclick="handleCardClick('${note.id}', 'notes')">
            <img src="${note.image_url || 'https://via.placeholder.com/150?text=No+Image'}" loading="lazy" alt="预览">
            <div class="note-info">
                <span class="note-tag note-category">${note.category}</span>
                <h5>${note.title}</h5>
            </div>
        </div>
    `).join('');
}

// 2. 切换分类点击处理器
function filterNotes(cat) {
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.classList.remove('active');
        if(tag.innerText === cat || (cat === 'all' && tag.innerText === '全部')) tag.classList.add('active');
    });
    loadNotes(cat);
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
                <span class="note-tag dailylog-date">${new Date(log.created_at).toLocaleDateString()}</span>
                <h5>${log.title}</h5>
            </div>
        </div>
    `).join('');
}

async function loadTips() {
    const grid = document.getElementById("tips-grid");
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
                <span class="note-tag tips">💡 知识点</span>
                <h5>${tip.title}</h5>
            </div>
        </div>
    `).join('');
}

// 2. 修改后的发送函数
async function addComment() {
    const nameInput = document.getElementById("name-input");
    const contentInput = document.getElementById("content-input");
    const submitBtn = document.querySelector('button[type="submit"]');
    
    const username = nameInput.value.trim();
    const content = contentInput.value.trim();

    // 修改验证逻辑：要么有文字，要么有录音
    if (!username || (!content && !audioBlob)) { 
        alert("名字和内容（或语音）都要写哦！"); 
        return; 
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "正在上传...";

    try {
        let audioUrl = null;

        // 如果有录音，先上传到 Supabase Storage
        if (audioBlob) {
            const fileName = `audio_${Date.now()}.webm`;
            const { data, error: uploadError } = await supabaseClient
                .storage
                .from('comment-audios') // 记得在 Supabase 控制台新建这个 Bucket
                .upload(fileName, audioBlob);

            if (uploadError) throw uploadError;

            // 获取公开访问链接
            const { data: publicUrlData } = supabaseClient.storage
                .from('comment-audios')
                .getPublicUrl(fileName);
            audioUrl = publicUrlData.publicUrl;
        }

        // 存入数据库 (增加 audio_url 字段)
        const { error } = await supabaseClient
            .from('comments')
            .insert([{ 
                username, 
                content, 
                location: "来自地球",
                audio_url: audioUrl // 需要在数据库表中增加这一列
            }]);

        if (!error) {
            contentInput.value = "";
            audioBlob = null;
            audioPreview.style.display = 'none';
            statusSpan.innerText = "";
            recordBtn.innerText = "🎤 开始录音";
        }
    } catch (err) {
        console.error(err);
        alert("发送失败，请检查网络或配置");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "发送";
    }
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
        container.innerHTML = '<p>暂无留言，快来抢沙发！</p>';
        return;
    }

    container.innerHTML = data.map(comment => `
        <div class="comment-card">
            ${isAdmin ? `<button class="delete-btn" onclick="deleteComment('${comment.id}')">×</button>` : ''}
            <div class="comment-header">
                <strong>${comment.username}</strong>
                <span class="location-tag">📍 ${comment.location || '中国'}</span>
            </div>
            
            ${comment.content ? `<p>${comment.content}</p>` : ''}
            
            ${comment.audio_url ? `
                <div class="audio-player" style="margin-top:10px;">
                    <audio 
                    src="${comment.audio_url}" 
                    controls 
                    preload="none" 
                    style="width:100%; height:40px;"
                    onplay="this.setAttribute('data-played', 'true')"
                    onclick="if(this.paused && this.getAttribute('data-played')) { this.load(); this.play(); }"
                    >
                    </audio>
                </div>
            ` : ''}

            <div class="comment-footer"><small>${new Date(comment.created_at).toLocaleString('zh-CN', { hour12: false })}</small></div>
        </div>
    `).join('');
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
                <small>${new Date(t.created_at).toLocaleString()}</small>
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
    if (type === 'notes') {
        postData.category = document.getElementById('note-post-category').value !== '选择分类' ? document.getElementById('note-post-category').value : '未分类';
    }
    if (type === 'tips') {
        postData.category = document.getElementById('tip-post-category').value || '未分类';
    }
    if (type === 'honors') {
        postData.issuer = document.getElementById('post-issuer').value.trim();
        postData.award_date = document.getElementById('post-date').value;
    }

    const { error } = editId 
        ? await supabaseClient.from(type).update(postData).eq('id', editId)
        : await supabaseClient.from(type).insert([postData]);

    if (error) {
        alert("操作失败");
    }    else { 
        localStorage.setItem('keep_admin_open', 'true'); 
        location.reload(); 
    }
}

async function importMarkdownFile() {
    const fileInput = document.getElementById('md-import-upload');
    const textArea = document.getElementById('post-content');
    const titleInput = document.getElementById('post-title');
    const status = document.getElementById('content-upload-status');

    if (fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    status.innerText = "正在读取 MD...";

    const reader = new FileReader();
    reader.onload = async (e) => {
        let content = e.target.result;

        // 1. 自动填充标题 (去掉 .md 后缀)
        if (!titleInput.value) {
            titleInput.value = file.name.replace('.md', '');
        }

        // 2. 检测本地图片路径 (检测 ![alt](path) 格式，排除 http)
        const localImageRegex = /!\[.*?\]\((?!(http:\/\/|https:\/\/|data:|\/))(.*?)\)/g;
        const matches = [...content.matchAll(localImageRegex)].filter(m => m[2].trim() !== 'path');

        if (matches.length > 0) {
            console.log("检测到的疑似本地路径列表：", matches.map(m => m[2]));
            const pathList = matches.slice(0, 3).map(m => m[2]).join(', ');
            const confirmImport = confirm(
                `⚠️ 检测到 ${matches.length} 处本地图片路径（如: ${pathList}...）。\n\n导入后这些图片将无法在网页显示。建议先在 Typora 中通过 PicGo 上传。是否仍要导入文字内容？`
            );
            if (!confirmImport) {
                status.innerText = "❌ 导入已取消";
                return;
            }
        }

        // 3. 将内容填入编辑器
        textArea.value = content;
        status.innerText = "✅ MD 导入成功";
        
        // 重置 input 方便下次导入
        fileInput.value = '';
    };

    reader.onerror = () => {
        alert("文件读取失败");
        status.innerText = "❌ 失败";
    };

    reader.readAsText(file);
}

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
    if (type === 'notes') {
        document.getElementById('note-post-category').value = data.category || "";
    }
    if (type === 'tips') {
        document.getElementById('tip-post-category').value = data.category || "";
    }
    if (type === 'honors') {
        document.getElementById('post-issuer').value = data.issuer || "";
        document.getElementById('post-date').value = data.award_date || "";
    }
}

let currentFontSize = parseInt(localStorage.getItem('userFontSize')) || 20;

window.addEventListener('DOMContentLoaded', () => {
    updateUI();
});

function changeFontSize(delta) {
    currentFontSize += delta;
    
    if (currentFontSize < 14) currentFontSize = 14;
    if (currentFontSize > 48) currentFontSize = 48;
    
    localStorage.setItem('userFontSize', currentFontSize);
    
    updateUI();
}

function updateUI() {
    const content = document.querySelector('.markdown-body');
    const label = document.getElementById('current-size-label');
    
    if (content) {
        content.style.fontSize = currentFontSize + 'px';
    }
    if (label) {
        label.innerText = `字号: ${currentFontSize}px`;
    }
}

function openNote(note) {

    const modal = document.getElementById('note-modal');
    const body = document.getElementById('modal-body');
    let displayContent = note.content || '暂无详细描述';
    
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (__ ) {}
            }
            return code; // 使用原代码内容
        },
        langPrefix: 'hljs '
    });

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

    smartTypeWriter('.modal-detail-title', 150, false);

    setTimeout(() => {
        body.querySelectorAll('.modal-detail-text img').forEach(img => {
            img.onclick = () => openImageViewer(img.src);
        });

        body.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        if (typeof renderMathInElement === 'function') {
            renderMathInElement(body, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
            });
        }
    }, 100);

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    updateUI(); // 确保每次打开详情页都应用用户设置的字号
}

function handleOverlayClick(event) {
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

async function deletePost() {
    const id = document.getElementById('edit-id').value;
    const type = document.getElementById('post-type').value;
    if (!id || !confirm("确定要永久删除吗？")) {
        return;
    }
    await supabaseClient.from(type).delete().eq('id', id);
    localStorage.setItem('keep_admin_open', 'true');
    location.reload();
}

async function logoutAdmin() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) console.error("退出失败");
    else {
        alert("已安全退出管理员模式");
        location.reload(); // 刷新后 session 消失，后台就会隐藏
    }
}

function toggleFields() {
    const type = document.getElementById('post-type').value;
    document.getElementById('honor-fields').style.display = (type === 'honors') ? 'block' : 'none';
    document.getElementById('note-fields').style.display = (type === 'notes') ? 'block' : 'none';
    document.getElementById('tips-fields').style.display = (type === 'tips') ? 'block' : 'none';
}

function initThemePicker() {
    const configs = [
        { id: 'primary-picker', var: '--primary-color', storage: 'theme-primary' },
        { id: 'card-bg-picker', var: '--card-bg', storage: 'theme-card' },
        { id: 'nav-bg-picker', var: '--nav-bg', storage: 'theme-nav' },
        { id: 'text-picker', var: '--text-color', storage: 'theme-text' }
    ];

    configs.forEach(item => {
        const saved = localStorage.getItem(item.storage);
        const picker = document.getElementById(item.id);
        if (saved) {
            document.documentElement.style.setProperty(item.var, saved);
            picker.value = saved;
        }
        
        picker.addEventListener('input', (e) => {
            const val = e.target.value;
            document.documentElement.style.setProperty(item.var, val);
            localStorage.setItem(item.storage, val);
        });
    });

    const panel = document.getElementById('settings-panel');
    document.getElementById('settings-toggle').onclick = () => panel.classList.toggle('active');

    const resetBtn = document.getElementById('reset-theme');
    
    const defaults = {
        '--primary-color': '#ba0000',
        '--card-bg': 'rgba(200, 191, 191, 0.8)',
        '--nav-bg': '#f6f8fa',
        '--text-color': '#000000'
    };

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            configs.forEach(item => {
                const defaultValue = defaults[item.var];
                document.documentElement.style.setProperty(item.var, defaultValue);
                const picker = document.getElementById(item.id);
                if (picker) picker.value = defaultValue;
                localStorage.removeItem(item.storage);
            });
            
            console.log("主题已重置为默认设置");
        });
    }
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target.id !== 'settings-toggle') {
            panel.classList.remove('active');
        }
    });
}

function smartTypeWriter(target, speed = 100, isLoop = false, loopDelay = 10000) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) return;

    const originalText = element.innerText;
    element.innerText = '';
    element.style.visibility = 'visible';

    let i = 0;

    function typing() {
        if (i < originalText.length) {
            element.innerText += originalText.charAt(i);
            i++;
            setTimeout(typing, speed);
        } else {
            if (isLoop) {
                setTimeout(() => {
                    element.innerText = '';
                    i = 0;
                    typing();
                }, loopDelay);
            }
        }
    }
    typing();
}

async function adminLogin() {
    const nameInput = document.getElementById("name-input");
    if (nameInput) {
        nameInput.value = localStorage.getItem('saved_username') || "";
        nameInput.addEventListener('input', async (e) => {
            if (e.target.value.trim() === "admin") {
                e.target.value = "";
                const dialog = document.getElementById('login-dialog');
                dialog.showModal(); 
            }

            document.getElementById('login-form').onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;

                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) {
                    alert("登录失败: " + error.message);
                } else {
                    alert("登录成功！");
                    location.reload(); 
                }
            };
        });
    }
}

function test() {
    window.alert("这是一个测试按钮，未来会有更多功能哦！敬请期待~");
    document.getElementById('settings-toggle').innerHTML = "⚙️ (测试成功)";
    console.log("测试按钮被点击了！");
}

let mediaRecorder;
let audioChunks = [];
let audioBlob = null; // 存储最终生成的音频文件
const recordBtn = document.getElementById('record-btn');
const statusSpan = document.getElementById('record-status');
const audioPreview = document.getElementById('audio-preview');

function initRecorder() {

    recordBtn.onclick = async () => {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioPreview.src = URL.createObjectURL(audioBlob);
                audioPreview.style.display = 'block';
            };

            mediaRecorder.start();
            recordBtn.innerText = "🛑 停止录制";
            recordBtn.style.backgroundColor = "#ff4d4f";
            statusSpan.innerText = "正在录音...";
        } else {
            mediaRecorder.stop();
            recordBtn.innerText = "🎤 重新录制";
            recordBtn.style.backgroundColor = "";
            statusSpan.innerText = "录制完成！";
        }
    };
}

window.onload = async () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add("dark-mode");
        document.getElementById("theme-btn").innerHTML = "☀️";
    }
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('thought-section').style.display = 'block';
        toggleFields();
        loadThoughts(); 
    }

    adminLogin();

    await Promise.all([loadComments(), loadNotes(), loadDailyLogs(), loadHonors(), loadTips()]);
    
    supabaseClient.channel('comments').on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'comments' 
    }, () => loadComments()).subscribe();

    initRecorder();

    initThemePicker();

    const loader = document.getElementById('loading-screen');
    if (loader) { 
        loader.style.opacity = '0'; 
        setTimeout(() => loader.style.display = 'none', 500); 
    }

    smartTypeWriter('.typewriter-text', 150, true, 10000);
}; 
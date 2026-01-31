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
                section.style.display = 'block';
                loadThoughts();
                
                // 成功解锁后的反馈
                e.target.value = ""; // 清空暗号
                alert("🔒 邓万穿的私密空间已解锁！");
                section.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // 加载数据
    await loadComments();

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
// ==================== 1. 配置与初始化 ====================
const SUPABASE_URL = 'https://hatfniprpjrjwzmximna.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_jFyW8ThJemLJHIbzIK085Q_cxmOnNxG';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== 2. UI 交互功能 ====================

// 切换夜间模式
function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById("theme-btn");
    body.classList.toggle("dark-mode");
    const isDark = body.classList.contains("dark-mode");
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    btn.innerHTML = isDark ? "☀️" : "🌙";
}

// 手机端菜单切换
function toggleMenu() {
    document.getElementById("nav-menu").classList.toggle("active");
}

// ==================== 3. 核心功能函数 ====================

// 获取并渲染留言列表 (唯一的、最完整的版本)
async function loadComments() {
    const container = document.getElementById("comments-container");
    const { data, error } = await supabaseClient
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('获取失败:', error);
        return;
    }

    container.innerHTML = "";
    if (data && data.length > 0) {
        data.forEach(item => {
            const time = new Date(item.created_at).toLocaleString('zh-CN', { hour12: false });
            const card = document.createElement("div");
            card.className = "comment-card";
            card.innerHTML = `
                <button class="delete-btn" onclick="deleteComment('${item.id}')" title="删除留言">×</button>
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
        container.innerHTML = '<p style="color: #888; text-align: center;">暂无留言，快来抢沙发！</p>';
    }

    if (container.scrollHeight > container.clientHeight) {
        console.log("提示：内容很多，可以滚动哦！");
        // 你可以根据这个逻辑，控制一个“向下箭头”图标的显隐
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
    const { error } = await supabaseClient.from('comments').delete().eq('id', id);
    if (error) alert("删除失败：" + error.message);
}

let clickCount = 0;

// 发送想法
async function addThought() {
    const input = document.getElementById("thought-input");
    const content = input.value.trim();
    if (!content) return;

    const { error } = await supabaseClient
        .from('thoughts') // 记得去云端建这张表
        .insert([{ content }]);

    if (!error) {
        input.value = "";
        loadThoughts();
    }
}

// 加载想法 (优化版：移除内联样式)
async function loadThoughts() {
    const container = document.getElementById("thoughts-container");
    const { data, error } = await supabaseClient
        .from('thoughts')
        .select('*')
        .order('created_at', { ascending: false });

    if (!error) {
        container.innerHTML = data.map(t => `
            <div class="thought-item">
                ${t.content} <br>
                <small style="color: #999;">${new Date(t.created_at).toLocaleString()}</small>
            </div>
        `).join('');
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
    const savedName = localStorage.getItem('saved_username');
    if (savedName) document.getElementById("name-input").value = savedName;

    // 🚀 手机端极致灵敏版绑定
    const avatar = document.querySelector('.avatar');
    if (avatar) {
        // 定义一个统一的处理器
        const handleSecretClick = (e) => {
            // 阻止系统可能存在的默认干扰
            if (e.cancelable) e.preventDefault(); 
            
            clickCount++;
            console.log("触碰次数:", clickCount);

            // 只要开始点，就重置 2 秒计时器
            clearTimeout(window.clickTimer);
            window.clickTimer = setTimeout(() => {
                clickCount = 0;
            }, 2000);

            if (clickCount === 2) {
                clickCount = 0; // 弹窗前先重置，防止重复触发
                const password = prompt("请输入暗号：");
                if (password === "admin") {
                    const section = document.getElementById('thought-section');
                    section.style.display = 'block';
                    loadThoughts();
                    section.scrollIntoView({ behavior: 'smooth' });
                    alert("欢迎回来，邓大神！");
                }
            }
        };

        // 同时监听两种事件，确保万无一失
        // 'touchend' 是手机端最灵敏的反馈
        avatar.addEventListener('touchend', handleSecretClick, { passive: false });
        // 'click' 留给电脑端
        avatar.addEventListener('click', (e) => {
            // 如果是手机已经触发过 touchend 了，click 就不再执行
            if (window.isTouched) return;
            handleSecretClick(e);
        });
        
        avatar.addEventListener('touchstart', () => { window.isTouched = true; });
    }
    
    // 加载数据
    await loadComments();

    // 开启实时监听
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
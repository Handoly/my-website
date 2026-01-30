// ==================== 1. 云端配置 (Supabase) ====================
const SUPABASE_URL = 'https://hatfniprpjrjwzmximna.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_jFyW8ThJemLJHIbzIK085Q_cxmOnNxG';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("脚本加载成功！准备连接云端 🚀");

// ==================== 2. UI 交互功能 (夜间模式与菜单) ====================

// 切换夜间模式
function toggleTheme() {
    var body = document.body;
    var btn = document.getElementById("theme-btn");
    body.classList.toggle("dark-mode");
    
    // 记住用户的模式偏好
    const isDark = body.classList.contains("dark-mode");
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    btn.innerHTML = isDark ? "☀️" : "🌙";
}

// 手机端菜单切换
function toggleMenu() {
    var menu = document.getElementById("nav-menu");
    menu.classList.toggle("active");
}

// ==================== 3. 页面加载初始化 ====================
window.onload = async () => {
    // A. 恢复之前的夜间模式设置
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add("dark-mode");
        const btn = document.getElementById("theme-btn");
        if(btn) btn.innerHTML = "☀️";
    }

    // B. 自动填充名字 (处理之前的 [object] 脏数据)
    const savedName = localStorage.getItem('saved_username');
    if (savedName && savedName !== "[object HTMLInputElement]") {
        document.getElementById("name-input").value = savedName;
    } else {
        localStorage.removeItem('saved_username');
    }

    // C. 初次加载留言列表
    await loadComments();

    // D. 开启全自动化实时监听 (增/删/改都会触发刷新)
    supabaseClient
        .channel('public-comments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
            console.log('检测到数据变动:', payload.eventType);
            loadComments(); 
        })
        .subscribe();
};

// ==================== 4. 核心功能函数 ====================

async function getUserLocation() {
    // 1. 优先尝试 Cloudflare 的官方地理位置接口 (极度稳定，无频率限制)
    try {
        const response = await fetch('https://cloudflare.com/cdn-cgi/trace');
        const text = await response.text();
        
        // 解析返回的文本 (Cloudflare 返回的是纯文本格式)
        const data = text.split('\n').reduce((obj, line) => {
            const [key, value] = line.split('=');
            if (key) obj[key] = value;
            return obj;
        }, {});

        // Cloudflare 返回的是国家代码（如 CN），我们将其转为更友好的文字
        if (data.loc) {
            return data.loc === 'CN' ? '中国' : data.loc;
        }
    } catch (e) {
        console.warn("Cloudflare 接口获取失败，切换备用方案...");
    }

    // 2. 备用方案：使用国内非常稳定的搜狐 IP 接口 (支持中文，对国内用户极其友好)
    try {
        const res = await fetch('https://pv.sohu.com/cityjson?ie=utf-8');
        const text = await res.text();
        // 处理搜狐返回的 var returnCitySN = {...} 格式
        const jsonStr = text.match(/\{.*\}/)[0];
        const data = JSON.parse(jsonStr);
        return data.cname || "未知"; // 返回如 "广东省广州市"
    } catch (e) {
        console.error("所有位置接口均失效:", e);
        return "未知";
    }
}

// 发送留言
async function addComment() {
    const nameInput = document.getElementById("name-input");
    const contentInput = document.getElementById("content-input");
    
    const username = nameInput.value.trim();
    const content = contentInput.value.trim();

    if (!username || !content) {
        alert("名字和内容都要写哦！");
        return;
    }

    // 存名字
    localStorage.setItem('saved_username', username);

    // 提交到 Supabase (位置暂时留空)
    const { error } = await supabaseClient
        .from('comments')
        .insert([{ 
            username: username, 
            content: content, 
            location: "来自地球"  // 暂时给个酷酷的默认值
        }]);

    if (!error) {
        contentInput.value = ""; 
    }
}

// 拉取并渲染留言列表
async function loadComments() {
    const container = document.getElementById("comments-container");
    
    // 获取数据，按时间倒序排列（最新的在最上面）
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
            // 格式化时间为本地格式
            const time = new Date(item.created_at).toLocaleString('zh-CN', { hour12: false });

            const card = document.createElement("div");
            card.className = "comment-card";
            card.innerHTML = `
                <button class="delete-btn" onclick="deleteComment('${item.id}')" title="删除留言">×</button>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                    <strong style="color: var(--text-color);">${item.username}</strong>
                    <span style="font-size: 11px; color: #666; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px;">
                        📍 ${item.location || '未知'}
                    </span>
                </div>
                <p style="margin: 8px 0; line-height: 1.5;">${item.content}</p>
                <div style="text-align: right;">
                    <small style="color: #999; font-size: 11px;">${time}</small>
                </div>
            `;
            container.appendChild(card);
        });
    } else {
        container.innerHTML = '<p style="color: #888; text-align: center; margin-top: 20px;">暂无留言，快来留下第一条吧！</p>';
    }
}

// 删除留言
async function deleteComment(id) {
    if (!confirm("真的要删除这条留言吗？")) return;

    const { error } = await supabaseClient
        .from('comments')
        .delete()
        .eq('id', id);

    if (error) {
        alert("删除失败：你可能需要检查 Supabase 的 RLS 权限是否已关闭");
        console.error(error);
    }
    // 提示：此处无需手动执行 loadComments()，实时监听会自动同步删除效果
}
// ==================== 3. 升级：留言功能 (从本地 -> 云端) ====================

// 页面加载时执行：从云端拉取
async function loadComments() {
    var container = document.getElementById("comments-container");
    
    // 向云端要数据
    const { data, error } = await supabaseClient
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false }); // 💡 取消注释：让新留言置顶

    if (error) {
        console.error('获取失败:', error);
        return;
    }

    container.innerHTML = "";
    if (data && data.length > 0) {
        data.forEach(function(item) {
            // 💡 格式化时间：转为“2023/10/24 14:30:00”这种格式
            const time = new Date(item.created_at).toLocaleString('zh-CN', {
                hour12: false
            });

            var card = document.createElement("div");
            card.className = "comment-card";
            
            // 💡 这里加入了 📍属地 和 🕒时间 的展示
            card.innerHTML = `
                <button class="delete-btn" onclick="deleteComment('${item.id}')">×</button>
                <div class="comment-header">
                    <strong>${item.username}</strong>
                    <span class="location-tag">📍 ${item.location || '未知'}</span>
                </div>
                <p style="margin-top: 8px; margin-bottom: 8px;">${item.content}</p>
                <div class="comment-footer">
                    <small style="color: #999;">${time}</small>
                </div>
            `;
            container.appendChild(card);
        });
    } else {
        container.innerHTML = '<p style="color: #888;">暂无留言，快来抢沙发！</p>';
    }
}

// 删除留言：在云端执行
async function deleteComment(id) {
    const { error } = await supabaseClient
        .from('comments')
        .delete()
        .eq('id', id); // 确保这里用的是 id 字段

    if (error) {
        alert("删除失败：" + error.message);
    }
}

// ==================== 4. 启动 ====================
window.onload = async () => {
    // 1. 尝试从浏览器本地读取名字
    const savedName = localStorage.getItem('saved_username');
    if (savedName) {
        document.getElementById("name-input").value = savedName;
    }

    // 2. 加载原有的留言列表和实时监听
    await loadComments();
    // ... 你的实时监听代码 ...

    // ==================== 5. 开启实时监听 ====================
    const channels = supabaseClient
    .channel('public-comments') // 给频道起个名字
    .on( 
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'comments' }, 
        (payload) => {
            console.log('检测到新留言！', payload);
            loadComments(); // 只要有人插入数据，就自动运行刷新函数
        }
    )
    .subscribe();

    // --- 在所有逻辑执行完后，关闭加载遮罩 ---
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.style.opacity = '0'; // 先变透明
        setTimeout(() => {
            loader.style.display = 'none'; // 0.5秒后彻底隐藏，不挡住鼠标点击
        }, 500);
    }
};


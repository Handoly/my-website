// ==================== 1. 云端配置 (Supabase) ====================
const SUPABASE_URL = 'https://hatfniprpjrjwzmximna.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_jFyW8ThJemLJHIbzIK085Q_cxmOnNxG';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("脚本加载成功！准备连接云端 🚀");

// ==================== 2. 保留：你的原有 UI 功能 ====================

// 切换夜间模式 (完美保留)
function toggleTheme() {
    var body = document.body;
    var btn = document.getElementById("theme-btn");
    body.classList.toggle("dark-mode");
    btn.innerHTML = body.classList.contains("dark-mode") ? "☀️" : "🌙";
}

// 手机端菜单切换 (完美保留)
function toggleMenu() {
    var menu = document.getElementById("nav-menu");
    menu.classList.toggle("active");
}

// ==================== 3. 升级：留言功能 (从本地 -> 云端) ====================

// 页面加载时执行：从云端拉取
async function loadComments() {
    var container = document.getElementById("comments-container");
    
    // 向云端要数据
    const { data, error } = await supabaseClient
        .from('comments')
        .select('*')
        // .order('created_at', { ascending: false });

    if (error) {
        console.error('获取失败:', error);
        return;
    }

    container.innerHTML = "";
    if (data && data.length > 0) {
        data.forEach(function(item) {
            var card = document.createElement("div");
            card.className = "comment-card";
            // 这里用 item.id 作为删除标识
            card.innerHTML = `
                <button class="delete-btn" onclick="deleteComment('${item.id}')">×</button>
                <strong>${item.username}</strong> 
                <p style="margin-top: 5px;">${item.content}</p>
            `;
            container.appendChild(card);
        });
    } else {
        container.innerHTML = '<p style="color: #888;">暂无留言，快来抢沙发！</p>';
    }
}

// 提交留言：发往云端
async function addComment() {
    console.log("按钮被点到了！"); // 检查这个
// 现在的写法：直接通过 ID 抓取，稳如老狗
    var nameInput = document.getElementById("name-input");
    var contentInput = document.getElementById("content-input");

    if (!nameInput.value.trim() || !contentInput.value.trim()) {
        alert("请输入名字和内容哦！");
        return;
    }

    const { error } = await supabaseClient
        .from('comments')
        .insert([{ username: nameInput.value, content: contentInput.value }]); // 这里确认你的数据库表列名是 username 和 content

    if (error) {
        alert("发送失败，可能是数据库表没建好或 URL 填错啦！");
        console.error(error);
    } else {
        nameInput.value = "";
        contentInput.value = "";
        loadComments(); // 刷新显示
        console.log("云端同步成功！");
    }
}

// 删除留言：在云端执行
async function deleteComment(id) {
    if (!confirm("确定要删除这条公共留言吗？")) return;

    const { error } = await supabaseClient
        .from('comments')
        .delete()
        .eq('id', id);

    if (error) {
        alert("删除失败，你可能需要关闭 RLS 权限。");
    } else {
        loadComments();
    }
}

// ==================== 4. 启动 ====================
window.onload = loadComments;

// ==================== 5. 开启实时监听 ====================
const channels = supabaseClient
  .channel('public-comments') // 给频道起个名字
  .on( 
    'postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'comments' }, 
    (payload) => {
        console.log('检测到新留言！', payload);
        loadComments(); // 只要有人插入数据，就自动运行刷新函数
    }
  )
  .subscribe();
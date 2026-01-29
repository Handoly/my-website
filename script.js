// 控制台打印一句话，证明 JS 连接成功
console.log("脚本加载成功！准备起飞 🚀");

// 模拟表单提交
function fakeSubmit() {
    alert("✅ 留言已发送！（假装的）");
}

// 切换夜间模式
function toggleTheme() {
    // 1. 获取 body 元素
    var body = document.body;
    // 2. 获取按钮元素
    var btn = document.getElementById("theme-btn");

    // 3. 切换类名：如果有 'dark-mode' 就删掉，没有就加上
    // classList.toggle 是个非常好用的开关方法
    body.classList.toggle("dark-mode");

    // 4. 根据当前状态修改按钮图标
    if (body.classList.contains("dark-mode")) {
        btn.innerHTML = "☀️"; // 变成太阳
    } else {
        btn.innerHTML = "🌙"; // 变成月亮
    }
}

// --- 📱 手机端菜单切换功能 ---
function toggleMenu() {
    // 1. 找到菜单元素
    var menu = document.getElementById("nav-menu");
    // 2. 切换 active 类（有就删，无就加）
    menu.classList.toggle("active");
}
// 控制台打印一句话，证明 JS 连接成功
console.log("脚本加载成功！准备起飞 🚀");

// 模拟表单提交
function fakeSubmit() {
    // 1. 拿到 HTML 里的输入元素
    var nameInput = document.querySelector('input[placeholder="你的名字"]');
    var textInput = document.querySelector('textarea[placeholder="想说的话..."]');
    var container = document.getElementById("comments-container");

    // 2. 检查是否有内容
    if (nameInput.value.trim() === "" || textInput.value.trim() === "") {
        alert("请输入名字和内容哦！");
        return;
    }

    // 3. 如果是第一条留言，清空“暂无留言”的文字
    if (container.innerHTML.includes("暂无留言")) {
        container.innerHTML = "";
    }

    // 4. 创建一个新的留言卡片 (Div)
    var newComment = document.createElement("div");
    newComment.className = "comment-card";
    
    // 5. 设置卡片内容
    newComment.innerHTML = "<strong>" + nameInput.value + " 说：</strong>" + textInput.value;

    // 6. 把卡片放到容器的最前面
    container.insertBefore(newComment, container.firstChild);

    // --- 新增：保存到本地 ---
    saveCommentLocal(nameInput.value, textInput.value);

    // 7. 清空输入框，方便下次输入
    nameInput.value = "";
    textInput.value = "";

    console.log("成功添加了一条新留言！");
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

// 函数 A：负责把留言存进“小抽屉”
function saveCommentLocal(name, text) {
    // 1. 先从抽屉里拿出以前的留言，如果没有，就准备个空数组 []
    var oldComments = JSON.parse(localStorage.getItem("myComments") || "[]");
    
    // 2. 把新留言包成一个“小对象”
    var newEntry = { name: name, content: text };
    
    // 3. 塞进数组的最前面
    oldComments.unshift(newEntry);
    
    // 4. 把更新后的数组放回抽屉（必须转成字符串才能存）
    localStorage.setItem("myComments", JSON.stringify(oldComments));
}

// 函数 B：页面一打开，就把抽屉里的留言全部拿出来显示
function loadComments() {
    var container = document.getElementById("comments-container");
    var oldComments = JSON.parse(localStorage.getItem("myComments") || "[]");

    if (oldComments.length > 0) {
        container.innerHTML = ""; // 清空“暂无留言”
        oldComments.forEach(function(item) {
            var card = document.createElement("div");
            card.className = "comment-card";
            card.innerHTML = "<strong>" + item.name + " 说：</strong>" + item.content;
            container.appendChild(card);
        });
    }
}

// --- 关键：这行代码让网页一加载就执行读取操作 ---
window.onload = loadComments;
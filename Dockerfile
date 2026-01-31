# 使用极其轻量级的 nginx 服务器作为底座
FROM nginx:alpine

# 把你当前文件夹下的所有文件，拷贝到 nginx 默认的网页存放路径
COPY . /usr/share/nginx/html/

# 暴露 80 端口（网页标准端口）
EXPOSE 80 
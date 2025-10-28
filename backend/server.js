import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors({
  origin: ['http://localhost:5173', 'https://yourusername.github.io'], // 替换为你的GitHub Pages域名
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// 确保上传目录存在
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 存储数据结构
let users = [];
let images = [];
let comments = [];

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

// 路由

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 获取所有用户
app.get('/api/users', (req, res) => {
  res.json(users);
});

// 用户注册
app.post('/api/register', (req, res) => {
  const { name, id, password, role } = req.body;
  
  if (!name || !id || !password) {
    return res.status(400).json({ error: '请填写所有字段' });
  }
  
  const existingUser = users.find(user => user.id === id);
  if (existingUser) {
    return res.status(400).json({ error: '用户ID已存在' });
  }
  
  if (role === 'admin') {
    const adminExists = users.some(user => user.role === 'admin');
    if (adminExists) {
      return res.status(400).json({ error: '管理员已存在' });
    }
  }
  
  const newUser = {
    id,
    name,
    password,
    role: role || 'user'
  };
  
  users.push(newUser);
  res.json({ 
    message: '注册成功', 
    user: { 
      id: newUser.id, 
      name: newUser.name, 
      role: newUser.role 
    } 
  });
});

// 用户登录
app.post('/api/login', (req, res) => {
  const { name, id, password, role } = req.body;
  
  if (!name || !id || !password) {
    return res.status(400).json({ error: '请填写所有字段' });
  }
  
  const user = users.find(u => u.id === id && u.name === name && u.password === password);
  
  if (user) {
    if (role && user.role !== role) {
      return res.status(400).json({ error: '角色不匹配' });
    }
    
    res.json({ 
      message: '登录成功', 
      user: { 
        id: user.id, 
        name: user.name, 
        role: user.role 
      } 
    });
  } else {
    res.status(401).json({ error: '用户名、ID或密码错误' });
  }
});

// 上传图片
app.post('/api/upload', upload.array('images', 10), (req, res) => {
  try {
    const { uploadedBy } = req.body;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: '没有选择文件' });
    }
    
    const newImages = files.map(file => ({
      id: uuidv4(),
      fileName: file.originalname,
      url: `/uploads/${file.filename}`,
      uploadedBy,
      uploadTime: new Date().toLocaleString('zh-CN')
    }));
    
    images.push(...newImages);
    
    res.json({ 
      message: `成功上传 ${files.length} 张图片`, 
      images: newImages 
    });
  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({ error: '上传失败: ' + error.message });
  }
});

// 获取所有图片
app.get('/api/images', (req, res) => {
  res.json(images);
});

// 提交评论
app.post('/api/comments', (req, res) => {
  const { imageId, userId, userName, userRole, text } = req.body;
  
  if (!imageId || !userId || !userName || !text) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  
  const newComment = {
    id: uuidv4(),
    imageId,
    userId,
    userName,
    userRole,
    text: text.trim(),
    timestamp: new Date().toLocaleString('zh-CN')
  };
  
  comments.push(newComment);
  res.json({ message: '评论提交成功', comment: newComment });
});

// 获取所有评论
app.get('/api/comments', (req, res) => {
  res.json(comments);
});

// 导出评论数据
app.get('/api/export-comments', (req, res) => {
  try {
    const csvData = comments.map(comment => {
      const image = images.find(img => img.id === comment.imageId);
      return {
        '图片文件名': image?.fileName || '未知',
        '用户ID': comment.userId,
        '用户姓名': comment.userName,
        '用户角色': comment.userRole === 'admin' ? '管理者' : '志愿者',
        '回复内容': comment.text,
        '时间': comment.timestamp
      };
    });
    
    const headers = ['图片文件名', '用户ID', '用户姓名', '用户角色', '回复内容', '时间'];
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=comments.csv');
    res.send('\uFEFF' + csv); // BOM for Excel
  } catch (error) {
    console.error('导出错误:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制' });
    }
  }
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
});
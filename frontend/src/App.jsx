import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image, MessageSquare, User, Lock, Eye, EyeOff, Download, FileText } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const App = () => {
  // 应用状态
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdminRegistered, setIsAdminRegistered] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  
  // 用户数据
  const [images, setImages] = useState([]);
  const [comments, setComments] = useState([]);
  
  // 表单状态
  const [loginForm, setLoginForm] = useState({ name: '', id: '', password: '', role: 'user' });
  const [registerForm, setRegisterForm] = useState({ name: '', id: '', password: '', role: 'user' });
  const [imageFiles, setImageFiles] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [imageComments, setImageComments] = useState({});
  
  // 文件输入引用
  const fileInputRef = useRef(null);

  // 加载数据
  useEffect(() => {
    loadImages();
    loadComments();
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const response = await fetch(`${API_BASE}/users`);
      const users = await response.json();
      const adminExists = users.some(user => user.role === 'admin');
      setIsAdminRegistered(adminExists);
    } catch (error) {
      console.error('检查管理员失败:', error);
    }
  };

  const loadImages = async () => {
    try {
      const response = await fetch(`${API_BASE}/images`);
      const imagesData = await response.json();
      setImages(imagesData);
    } catch (error) {
      console.error('加载图片失败:', error);
    }
  };

  const loadComments = async () => {
    try {
      const response = await fetch(`${API_BASE}/comments`);
      const commentsData = await response.json();
      setComments(commentsData);
    } catch (error) {
      console.error('加载回复失败:', error);
    }
  };

  // 处理登录
  const handleLogin = async (e) => {
    e.preventDefault();
    const { name, id, password, role } = loginForm;
    
    if (!name || !id || !password) {
      setLoginError('请填写所有字段');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, id, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentUser(data.user);
        setLoginError('');
      } else {
        setLoginError(data.error);
      }
    } catch (error) {
      setLoginError('登录失败，请检查网络连接');
    }
  };

  // 处理注册
  const handleRegister = async (e) => {
    e.preventDefault();
    const { name, id, password, role } = registerForm;
    
    if (!name || !id || !password) {
      setRegisterError('请填写所有字段');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, id, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setRegisterError('');
        setRegisterForm({ name: '', id: '', password: '', role: 'user' });
        setShowLogin(true);
        checkAdminExists();
      } else {
        setRegisterError(data.error);
      }
    } catch (error) {
      setRegisterError('注册失败，请检查网络连接');
    }
  };

  // 处理文件选择
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(files);
  };

  // 处理批量上传
  const handleBatchUpload = async (e) => {
    e.preventDefault();
    if (imageFiles.length === 0 || !currentUser) return;

    const formData = new FormData();
    imageFiles.forEach(file => {
      formData.append('images', file);
    });
    formData.append('uploadedBy', currentUser.name);

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setImages(prev => [...prev, ...data.images]);
        setImageFiles([]);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        console.error('上传失败:', data.error);
      }
    } catch (error) {
      console.error('上传失败:', error);
    }
  };

  // 处理回复提交
  const handleCommentSubmit = async (imageId) => {
    const commentText = imageComments[imageId] || '';
    if (!commentText.trim() || !currentUser) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          text: commentText.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setComments(prev => [...prev, data.comment]);
        setImageComments(prev => ({
          ...prev,
          [imageId]: ''
        }));
      }
    } catch (error) {
      console.error('回复提交失败:', error);
    }
  };

  // 获取用户对特定图片的回复
  const getUserCommentForImage = (imageId) => {
    return comments.find(comment => 
      comment.imageId === imageId && 
      comment.userId === currentUser.id
    );
  };

  // 退出登录
  const handleLogout = () => {
    setCurrentUser(null);
    setShowLogin(true);
    setImageComments({});
  };

  // 导出回复数据（管理者功能）
  const exportCommentsData = () => {
    const url = `${API_BASE}/export-comments`;
    window.open(url, '_blank');
  };

  // 渲染登录/注册表单
  const renderAuthForm = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Image className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">尺素传情系统</h1>
            <p className="text-gray-600 mt-2">请先登录或注册</p>
          </div>

          {showLogin ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">角色</label>
                  <select
                    value={loginForm.role}
                    onChange={(e) => setLoginForm({...loginForm, role: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="user">志愿者</option>
                    <option value="admin">管理者</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                  <input
                    type="text"
                    value={loginForm.name}
                    onChange={(e) => setLoginForm({...loginForm, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="请输入姓名"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">志愿者编号</label>
                  <input
                    type="text"
                    value={loginForm.id}
                    onChange={(e) => setLoginForm({...loginForm, id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="请输入志愿者编号"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-12"
                      placeholder="请输入密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
              
              {loginError && (
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {loginError}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                登录
              </button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  还没有账户？立即注册
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">角色</label>
                  <select
                    value={registerForm.role}
                    onChange={(e) => setRegisterForm({...registerForm, role: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isAdminRegistered && registerForm.role === 'admin'}
                  >
                    <option value="user">志愿者</option>
                    <option value="admin" disabled={isAdminRegistered}>
                      {isAdminRegistered ? '管理者已存在' : '管理者'}
                    </option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                  <input
                    type="text"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="请输入姓名"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">志愿者编号</label>
                  <input
                    type="text"
                    value={registerForm.id}
                    onChange={(e) => setRegisterForm({...registerForm, id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="请输入志愿者编号"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="请输入密码"
                  />
                </div>
              </div>
              
              {registerError && (
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {registerError}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                注册
              </button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowLogin(true)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  已有账户？立即登录
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  // 渲染管理者界面
  const renderAdminView = () => {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 顶部导航 */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">管理者 - {currentUser.name}</h1>
                  <p className="text-sm text-gray-500">ID: {currentUser.id}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowCommentsModal(true)}
                  disabled={comments.length === 0}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" />
                  <span>回复数据 ({comments.length})</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 上传区域 */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-indigo-600" />
              批量上传图片
            </h2>
            <form onSubmit={handleBatchUpload} className="space-y-4">
              <div className="flex flex-col space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="w-full"
                />
                
                {imagePreviews.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">预览 ({imagePreviews.length} 张图片):</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                      {imagePreviews.slice(0, 8).map((preview, index) => (
                        <img
                          key={index}
                          src={preview.preview}
                          alt={`预览 ${index + 1}`}
                          className="w-full h-16 object-cover rounded"
                        />
                      ))}
                      {imagePreviews.length > 8 && (
                        <div className="w-full h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                          +{imagePreviews.length - 8} 更多
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      选中 {imagePreviews.length} 个文件
                    </p>
                  </div>
                )}
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={imageFiles.length === 0}
                    className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    批量上传
                  </button>
                  
                  {/* 保留单个上传选项 */}
                  {imageFiles.length === 1 && (
                    <button
                      type="button"
                      onClick={handleSingleUpload}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      单个上传
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* 图片列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => {
              const userComment = getUserCommentForImage(image.id);
              const currentComment = imageComments[image.id] || '';
              return (
                <div key={image.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <img
                      src={`${image.url.startsWith('http') ? image.url : API_BASE.replace('/api', '') + image.url}`}
                      alt={image.fileName}
                      className="w-full h-full object-contain p-4"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{image.fileName}</p>
                        <p className="text-sm text-gray-500">{image.uploadTime}</p>
                      </div>
                    </div>
                    
                    {userComment ? (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700 mb-1">你的回复:</p>
                        <p className="text-gray-900 break-words">{userComment.text}</p>
                        <p className="text-xs text-gray-500 mt-1">{userComment.timestamp}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={currentComment}
                          onChange={(e) => updateImageComment(image.id, e.target.value)}
                          placeholder="添加你的回复..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                          rows="2"
                        />
                        <button
                          onClick={() => handleCommentSubmit(image.id)}
                          disabled={!currentComment.trim()}
                          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          回复
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {images.length === 0 && (
            <div className="text-center py-12">
              <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">还没有上传任何图片</p>
            </div>
          )}
        </div>

        {/* 回复数据模态框 */}
        {showCommentsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">所有回复数据</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={exportCommentsData}
                    disabled={comments.length === 0}
                    className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    <span>导出CSV</span>
                  </button>
                  <button
                    onClick={() => setShowCommentsModal(false)}
                    className="px-3 py-2 text-gray-700 hover:text-gray-900"
                  >
                    关闭
                  </button>
                </div>
              </div>
              
              <div className="overflow-auto flex-1">
                {comments.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    暂无回复数据
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="grid grid-cols-12 gap-4 font-semibold text-gray-900 pb-2 border-b">
                      <div className="col-span-2">图片文件名</div>
                      <div className="col-span-2">用户ID</div>
                      <div className="col-span-2">用户姓名</div>
                      <div className="col-span-2">用户角色</div>
                      <div className="col-span-3">回复内容</div>
                      <div className="col-span-1">时间</div>
                    </div>
                    <div className="space-y-2 mt-2 max-h-96 overflow-y-auto">
                      {comments.map((comment) => {
                        const image = images.find(img => img.id === comment.imageId);
                        return (
                          <div key={comment.id} className="grid grid-cols-12 gap-4 text-sm text-gray-700 py-2 border-b border-gray-100">
                            <div className="col-span-2 truncate">{image?.fileName || '未知'}</div>
                            <div className="col-span-2">{comment.userId}</div>
                            <div className="col-span-2">{comment.userName}</div>
                            <div className="col-span-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                comment.userRole === 'admin' 
                                  ? 'bg-indigo-100 text-indigo-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {comment.userRole === 'admin' ? '管理者' : '志愿者'}
                              </span>
                            </div>
                            <div className="col-span-3 break-words">{comment.text}</div>
                            <div className="col-span-1 text-xs">{comment.timestamp}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染志愿者界面
  const renderUserView = () => {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 顶部导航 */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">志愿者 - {currentUser.name}</h1>
                  <p className="text-sm text-gray-500">ID: {currentUser.id}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                退出登录
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {images.length === 0 ? (
            <div className="text-center py-12">
              <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">管理者还没有上传任何图片</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((image) => {
                const userComment = getUserCommentForImage(image.id);
                const currentComment = imageComments[image.id] || '';
                return (
                  <div key={image.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                     <img
                        src={`${image.url.startsWith('http') ? image.url : API_BASE.replace('/api', '') + image.url}`}
                        alt={image.fileName}
                        className="w-full h-full object-contain p-4"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{image.fileName}</p>
                          <p className="text-sm text-gray-500">{image.uploadTime}</p>
                        </div>
                      </div>
                      
                      {userComment ? (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-700 mb-1">你的回复:</p>
                          <p className="text-gray-900 break-words">{userComment.text}</p>
                          <p className="text-xs text-gray-500 mt-1">{userComment.timestamp}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            value={currentComment}
                            onChange={(e) => updateImageComment(image.id, e.target.value)}
                            placeholder="添加你的回复..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            rows="2"
                          />
                          <button
                            onClick={() => handleCommentSubmit(image.id)}
                            disabled={!currentComment.trim()}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            回复
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 根据当前用户状态渲染不同界面
  if (!currentUser) {
    return renderAuthForm();
  }

  if (currentUser.role === 'admin') {
    return renderAdminView();
  } else {
    return renderUserView();
  }
};

export default App;

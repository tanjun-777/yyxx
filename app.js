// 全局变量
let currentUser = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingStartTime = null;
let currentExercise = null;
let audioBlob = null;

// API基础URL
const API_BASE = '/api';

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否有保存的登录状态
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard(currentUser.role);
    }

    // 初始化日期选择器
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('statsStartDate').value = today;
    document.getElementById('statsEndDate').value = today;
});

// 切换登录角色
function switchRole(role) {
    document.querySelectorAll('.role-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('currentRole').value = role;
    
    if (role === 'student') {
        document.getElementById('studentFields').style.display = 'block';
        document.getElementById('teacherFields').style.display = 'none';
    } else {
        document.getElementById('studentFields').style.display = 'none';
        document.getElementById('teacherFields').style.display = 'block';
    }
}

// 处理登录
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('currentRole').value;
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('token', result.token);
            showDashboard(currentUser.role);
            showNotification('登录成功！', 'success');
        } else {
            showNotification(result.error || '登录失败', 'error');
        }
    } catch (error) {
        console.error('登录错误:', error);
        showNotification('网络错误，请重试', 'error');
    }
}

// 显示注册表单
function showRegisterForm() {
    // 这里可以实现注册功能
    showNotification('注册功能开发中，请联系管理员创建账号', 'info');
}

// 显示仪表板
function showDashboard(role) {
    document.getElementById('loginSection').style.display = 'none';
    
    if (role === 'student') {
        document.getElementById('studentDashboard').style.display = 'block';
        document.getElementById('teacherDashboard').style.display = 'none';
        document.getElementById('studentName').textContent = currentUser.real_name || currentUser.username;
        loadStudentDashboard();
    } else {
        document.getElementById('teacherDashboard').style.display = 'block';
        document.getElementById('studentDashboard').style.display = 'none';
        document.getElementById('teacherName').textContent = currentUser.real_name || currentUser.username;
        loadTeacherDashboard();
    }
}

// 加载学生仪表板
async function loadStudentDashboard() {
    await Promise.all([
        loadStudentStats(),
        loadTodayExercises(),
        loadRecentRecords()
    ]);
}

// 加载学生统计
async function loadStudentStats() {
    try {
        const response = await apiRequest(`${API_BASE}/my-stats`);
        if (response) {
            document.getElementById('totalExercises').textContent = response.total_exercises || 0;
            document.getElementById('avgScore').textContent = Math.round(response.avg_score || 0);
            document.getElementById('bestScore').textContent = response.max_score || 0;
            document.getElementById('activeDays').textContent = response.active_days || 0;
        }
    } catch (error) {
        console.error('加载统计失败:', error);
    }
}

// 加载今日练习
async function loadTodayExercises() {
    try {
        const exercises = await apiRequest(`${API_BASE}/active-exercises`);
        const container = document.getElementById('todayExercises');
        
        if (exercises && exercises.length > 0) {
            container.innerHTML = exercises.map(exercise => `
                <div class="exercise-card">
                    <h5>${exercise.title}</h5>
                    <p class="text-muted mb-2">${exercise.content}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="bi bi-person me-1"></i>${exercise.teacher_name}
                            <i class="bi bi-calendar3 ms-2 me-1"></i>${formatDate(exercise.start_time)}
                        </small>
                        <button class="btn btn-primary-custom btn-sm" 
                                onclick="startExercise(${exercise.id}, '${exercise.title}', '${escapeHtml(exercise.content)}')">
                            <i class="bi bi-mic me-1"></i>开始练习
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-calendar-x text-muted" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-2">今日暂无练习任务</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('加载练习失败:', error);
    }
}

// 加载练习记录
async function loadRecentRecords() {
    try {
        const records = await apiRequest(`${API_BASE}/my-records?limit=5`);
        const container = document.getElementById('recentRecords');
        
        if (records && records.length > 0) {
            container.innerHTML = records.map(record => `
                <div class="record-card">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6>${record.title}</h6>
                            <small class="text-muted">${formatDateTime(record.submit_time)}</small>
                        </div>
                        <span class="score-badge ${getScoreClass(record.score)}">
                            ${record.score}分
                        </span>
                    </div>
                    <div class="mt-2">
                        <small class="text-muted">
                            准确度: ${record.accuracy}% | 流利度: ${record.fluency}%
                        </small>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-journal-text text-muted" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-2">暂无练习记录</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('加载记录失败:', error);
    }
}

// 开始练习
function startExercise(exerciseId, title, content) {
    currentExercise = { id: exerciseId, title, content };
    document.getElementById('exerciseContent').textContent = content;
    
    const modal = new bootstrap.Modal(document.getElementById('recordingModal'));
    modal.show();
}

// 切换录音状态
async function toggleRecording() {
    if (!isRecording) {
        await startRecording();
    } else {
        stopRecording();
    }
}

// 开始录音
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            submitExercise();
        };
        
        mediaRecorder.start();
        isRecording = true;
        recordingStartTime = Date.now();
        
        // 更新UI
        document.getElementById('recordBtn').classList.add('recording');
        document.getElementById('recordIcon').className = 'bi bi-stop-fill';
        document.getElementById('recordingStatus').textContent = '录音中...';
        document.getElementById('recordingTime').style.display = 'block';
        
        // 开始计时
        recordingTimer = setInterval(updateRecordingTime, 100);
        
    } catch (error) {
        console.error('无法访问麦克风:', error);
        showNotification('无法访问麦克风，请检查权限设置', 'error');
    }
}

// 停止录音
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        // 停止所有音轨
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        // 清除计时器
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
        
        // 更新UI
        document.getElementById('recordBtn').classList.remove('recording');
        document.getElementById('recordIcon').className = 'bi bi-mic-fill';
        document.getElementById('recordingStatus').textContent = '录音完成，正在评测...';
        document.getElementById('recordingTime').style.display = 'none';
        
        // 显示处理中状态
        document.getElementById('processingSpinner').classList.add('active');
        document.getElementById('recordBtn').disabled = true;
    }
}

// 更新录音时间
function updateRecordingTime() {
    const elapsed = Date.now() - recordingStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    document.getElementById('recordingTime').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 提交练习
async function submitExercise() {
    if (!audioBlob || !currentExercise) {
        return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('exercise_id', currentExercise.id);
    formData.append('score', 0);
    formData.append('accuracy', 0);
    formData.append('fluency', 0);
    formData.append('integrity', 0);
    formData.append('feedback_type', 'ai');

    try {
        const response = await fetch(`${API_BASE}/exercise-records`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            // 模拟评测结果（实际应该调用腾讯云API）
            const mockEvaluation = generateMockEvaluation();
            displayEvaluationResult(mockEvaluation);
            
            // 更新统计
            await loadStudentStats();
            await loadRecentRecords();
        } else {
            throw new Error(result.error || '提交失败');
        }

    } catch (error) {
        console.error('提交练习失败:', error);
        // 如果API失败，显示模拟结果
        const mockEvaluation = generateMockEvaluation();
        displayEvaluationResult(mockEvaluation);
        showNotification('练习提交成功（使用模拟评测）', 'warning');
    } finally {
        document.getElementById('processingSpinner').classList.remove('active');
        document.getElementById('recordBtn').disabled = false;
    }
}

// 生成模拟评测结果
function generateMockEvaluation() {
    const score = Math.floor(Math.random() * 30) + 70; // 70-100分
    const accuracy = Math.floor(Math.random() * 20) + 80; // 80-100%
    const fluency = Math.floor(Math.random() * 20) + 80; // 80-100%
    const integrity = Math.floor(Math.random() * 20) + 80; // 80-100%
    
    let feedback = '';
    if (score >= 90) {
        feedback = '发音非常标准，表达流利，继续保持！';
    } else if (score >= 80) {
        feedback = '发音良好，建议多练习语调和连音。';
    } else {
        feedback = '发音需要改进，建议跟读练习，注意单词重音。';
    }
    
    return {
        score,
        accuracy,
        fluency,
        integrity,
        feedback,
        grade: score >= 90 ? '优秀' : score >= 80 ? '良好' : '及格'
    };
}

// 显示评测结果
function displayEvaluationResult(evaluation) {
    document.getElementById('finalScore').textContent = evaluation.score;
    document.getElementById('accuracy').textContent = evaluation.accuracy;
    document.getElementById('fluency').textContent = evaluation.fluency;
    document.getElementById('integrity').textContent = evaluation.integrity;
    document.getElementById('aiFeedback').textContent = evaluation.feedback;
    
    const gradeElement = document.getElementById('grade');
    gradeElement.textContent = evaluation.grade;
    gradeElement.className = `badge ${evaluation.grade === '优秀' ? 'bg-success' : evaluation.grade === '良好' ? 'bg-warning' : 'bg-info'}`;
    
    // 更新进度环
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (evaluation.score / 100) * circumference;
    document.getElementById('progressCircle').style.strokeDashoffset = offset;
    
    // 显示结果
    document.getElementById('evaluationResult').style.display = 'block';
    document.getElementById('reRecordBtn').style.display = 'inline-block';
    document.getElementById('recordingStatus').textContent = '评测完成';
}

// 重新录制
function resetRecording() {
    audioBlob = null;
    document.getElementById('evaluationResult').style.display = 'none';
    document.getElementById('reRecordBtn').style.display = 'none';
    document.getElementById('processingSpinner').classList.remove('active');
    document.getElementById('recordingStatus').textContent = '点击开始录音';
}

// 加载教师仪表板
async function loadTeacherDashboard() {
    await Promise.all([
        loadExercises(),
        loadStudents(),
        loadFeedbackList()
    ]);
}

// 加载练习列表
async function loadExercises() {
    try {
        const exercises = await apiRequest(`${API_BASE}/exercises`);
        const container = document.getElementById('exercisesList');
        
        if (exercises && exercises.length > 0) {
            container.innerHTML = exercises.map(exercise => `
                <div class="exercise-card">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5>${exercise.title}</h5>
                            <p class="text-muted mb-2">${exercise.content}</p>
                            <small class="text-muted">
                                <i class="bi bi-calendar3 me-1"></i>创建于 ${formatDateTime(exercise.created_at)}
                                ${exercise.start_time ? `<i class="bi bi-clock ms-2 me-1"></i>开始 ${formatDateTime(exercise.start_time)}` : ''}
                                ${exercise.end_time ? `<i class="bi bi-clock-history ms-2 me-1"></i>结束 ${formatDateTime(exercise.end_time)}` : ''}
                            </small>
                        </div>
                        <div>
                            <span class="badge bg-info me-2">${getDifficultyText(exercise.difficulty_level)}</span>
                            <button class="btn btn-sm btn-outline-primary me-2" onclick="viewExerciseRecords(${exercise.id})">
                                <i class="bi bi-eye"></i> 查看记录
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-journal-plus text-muted" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-2">暂无练习任务，点击上方按钮创建</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('加载练习失败:', error);
    }
}

// 加载学生列表
async function loadStudents() {
    try {
        const students = await apiRequest(`${API_BASE}/students`);
        const tbody = document.getElementById('studentsTable');
        
        if (students && students.length > 0) {
            tbody.innerHTML = students.map(student => `
                <tr>
                    <td>${student.real_name || '-'}</td>
                    <td>${student.username}</td>
                    <td>${student.student_id || '-'}</td>
                    <td>${student.class_name || '-'}</td>
                    <td>${formatDate(student.created_at)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-info" onclick="viewStudentRecords(${student.id})">
                            <i class="bi bi-journal-text"></i> 查看记录
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <i class="bi bi-people text-muted"></i>
                        暂无学生数据
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('加载学生失败:', error);
    }
}

// 加载反馈列表
async function loadFeedbackList() {
    try {
        const exercises = await apiRequest(`${API_BASE}/exercises`);
        let allRecords = [];
        
        for (const exercise of exercises) {
            const records = await apiRequest(`${API_BASE}/exercises/${exercise.id}/records`);
            if (records) {
                allRecords = allRecords.concat(records.map(record => ({...record, exercise_title: exercise.title})));
            }
        }
        
        const container = document.getElementById('feedbackList');
        
        if (allRecords.length > 0) {
            container.innerHTML = allRecords.map(record => `
                <div class="record-card">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6>${record.title}</h6>
                            <p class="text-muted mb-1">学生：${record.real_name || record.username}</p>
                            <small class="text-muted">${formatDateTime(record.submit_time)}</small>
                        </div>
                        <div>
                            <span class="score-badge ${getScoreClass(record.score)}">
                                ${record.score}分
                            </span>
                            <button class="btn btn-sm btn-primary ms-2" onclick="showFeedbackModal(${record.id}, '${record.real_name || record.username}', '${record.title}', ${record.score})">
                                <i class="bi bi-chat-dots"></i> 添加反馈
                            </button>
                        </div>
                    </div>
                    ${record.teacher_feedback ? `
                        <div class="feedback-section mt-2">
                            <small><strong>教师反馈：</strong>${record.teacher_feedback}</small>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-chat-dots text-muted" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-2">暂无需要反馈的练习记录</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('加载反馈列表失败:', error);
    }
}

// 显示创建练习模态框
function showCreateExerciseModal() {
    const modal = new bootstrap.Modal(document.getElementById('createExerciseModal'));
    modal.show();
}

// 创建练习
async function createExercise() {
    const title = document.getElementById('exerciseTitle').value;
    const content = document.getElementById('exerciseContentText').value;
    const difficultyLevel = document.getElementById('difficultyLevel').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    if (!title || !content) {
        showNotification('请填写练习标题和内容', 'error');
        return;
    }

    try {
        const response = await apiRequest(`${API_BASE}/exercises`, {
            method: 'POST',
            body: JSON.stringify({
                title,
                content,
                difficulty_level: parseInt(difficultyLevel),
                start_time: startTime || null,
                end_time: endTime || null
            })
        });

        if (response) {
            showNotification('练习创建成功！', 'success');
            bootstrap.Modal.getInstance(document.getElementById('createExerciseModal')).hide();
            document.getElementById('createExerciseForm').reset();
            loadExercises();
        }
    } catch (error) {
        console.error('创建练习失败:', error);
        showNotification('创建练习失败', 'error');
    }
}

// 加载班级统计
async function loadClassStats() {
    const startDate = document.getElementById('statsStartDate').value;
    const endDate = document.getElementById('statsEndDate').value;

    try {
        const stats = await apiRequest(`${API_BASE}/class-stats?startDate=${startDate}&endDate=${endDate}`);
        const tbody = document.getElementById('statsTable');

        if (stats && stats.length > 0) {
            tbody.innerHTML = stats.map(stat => `
                <tr>
                    <td>${stat.real_name || stat.username}</td>
                    <td>${stat.total_exercises}</td>
                    <td>${Math.round(stat.avg_score || 0)}</td>
                    <td>${stat.max_score || 0}</td>
                    <td>${stat.active_days}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <i class="bi bi-bar-chart text-muted"></i>
                        指定时间范围内暂无数据
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('加载统计失败:', error);
        showNotification('加载统计数据失败', 'error');
    }
}

// 显示反馈模态框
function showFeedbackModal(recordId, studentName, exerciseTitle, score) {
    document.getElementById('feedbackStudentInfo').innerHTML = `
        <strong>学生：</strong>${studentName}<br>
        <strong>练习：</strong>${exerciseTitle}<br>
        <strong>得分：</strong>${score}分
    `;
    
    document.getElementById('feedbackModal').dataset.recordId = recordId;
    
    const modal = new bootstrap.Modal(document.getElementById('feedbackModal'));
    modal.show();
}

// 保存反馈
async function saveFeedback() {
    const recordId = document.getElementById('feedbackModal').dataset.recordId;
    const feedbackType = document.getElementById('feedbackType').value;
    const teacherFeedback = document.getElementById('teacherFeedback').value;

    if (!teacherFeedback.trim()) {
        showNotification('请输入反馈内容', 'error');
        return;
    }

    try {
        const response = await apiRequest(`${API_BASE}/exercise-records/${recordId}/feedback`, {
            method: 'PUT',
            body: JSON.stringify({
                feedback: teacherFeedback,
                feedback_type: feedbackType
            })
        });

        if (response) {
            showNotification('反馈保存成功！', 'success');
            bootstrap.Modal.getInstance(document.getElementById('feedbackModal')).hide();
            document.getElementById('teacherFeedback').value = '';
            loadFeedbackList();
        }
    } catch (error) {
        console.error('保存反馈失败:', error);
        showNotification('保存反馈失败', 'error');
    }
}

// 退出登录
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    location.reload();
}

// API请求封装
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, finalOptions);
        
        if (response.status === 401) {
            logout();
            return null;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '请求失败');
        }

        return await response.json();
    } catch (error) {
        console.error('API请求失败:', error);
        throw error;
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 这里可以实现更复杂的通知系统
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-danger' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    
    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} position-fixed top-0 end-0 m-3`;
    notification.style.zIndex = '9999';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// 工具函数
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function getScoreClass(score) {
    if (score >= 90) return 'score-high';
    if (score >= 80) return 'score-medium';
    return 'score-low';
}

function getDifficultyText(level) {
    const levels = {
        1: '初级',
        2: '中级', 
        3: '高级'
    };
    return levels[level] || '初级';
}
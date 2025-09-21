// 全局变量
let capturedImage = null;
let uploadedImage = null;
let timer = null;
let remainingTime = 0;
let stream = null;

// API配置信息
const API_URL = 'https://openapi.youdao.com/v2/correct_writing_image';
// 请在实际使用时填写您的应用ID和密钥
const APP_KEY = '1ae292ef39471601';
const APP_SECRET = 'k3wCpLujOOGx8nrTJEPiVPhQMO20HiQS';

// 创建代理URL以解决跨域问题
const PROXY_URL = 'https://cors-anywhere.herokuapp.com/';
// 最终请求URL
const REQUEST_URL = PROXY_URL + API_URL;

// DOM 元素加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化模式切换
    initModeSwitch();
    
    // 初始化相机功能
    initCameraFunctions();
    
    // 初始化文件上传
    initFileUpload();
    
    // 初始化提交按钮
    document.getElementById('submitBtn').addEventListener('click', handleSubmit);
    
    // 默认启用写作报告选项（因为只有高级版）
    document.getElementById('needEssayReport').disabled = false;
    
    // 添加标签切换事件监听器
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', event => {
            // 切换标签时重置另一个输入方式的图片
            if (event.target.id === 'camera-tab') {
                resetFileUpload();
            } else if (event.target.id === 'file-tab') {
                resetCamera();
            }
        });
    });
});

// 初始化写作模式切换
function initModeSwitch() {
    const freeWriting = document.getElementById('freeWriting');
    const timedWriting = document.getElementById('timedWriting');
    const timerContainer = document.getElementById('timerContainer');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const timerDisplay = document.getElementById('timerDisplay');
    
    // 模式切换事件
    freeWriting.addEventListener('change', function() {
        if (this.checked) {
            timerContainer.classList.add('d-none');
            stopTimer();
        }
    });
    
    timedWriting.addEventListener('change', function() {
        if (this.checked) {
            timerContainer.classList.remove('d-none');
        }
    });
    
    // 开始计时按钮
    startTimerBtn.addEventListener('click', function() {
        const minutes = parseInt(document.getElementById('timerInput').value, 10);
        if (isNaN(minutes) || minutes <= 0 || minutes > 120) {
            showAlert('请输入1-120之间的有效时间！', 'warning');
            return;
        }
        
        remainingTime = minutes * 60;
        updateTimerDisplay();
        timerDisplay.classList.remove('d-none');
        startTimer();
        this.disabled = true;
        document.getElementById('timerInput').disabled = true;
    });
}

// 开始计时器
function startTimer() {
    if (timer) {
        clearInterval(timer);
    }
    
    timer = setInterval(function() {
        remainingTime--;
        updateTimerDisplay();
        
        if (remainingTime <= 0) {
            stopTimer();
            showAlert('时间到！请提交您的作文。', 'info');
        }
    }, 1000);
}

// 停止计时器
function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    
    const startTimerBtn = document.getElementById('startTimerBtn');
    const timerInput = document.getElementById('timerInput');
    
    if (startTimerBtn) startTimerBtn.disabled = false;
    if (timerInput) timerInput.disabled = false;
}

// 更新计时器显示
function updateTimerDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    const timerDisplay = document.getElementById('timerDisplay');
    
    if (timerDisplay) {
        timerDisplay.querySelector('span').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// 显示提示信息
function showAlert(message, type = 'info') {
    // 移除现有的提示
    const existingAlert = document.getElementById('customAlert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertClass = {
        'info': 'alert-info',
        'success': 'alert-success',
        'warning': 'alert-warning',
        'danger': 'alert-danger'
    }[type] || 'alert-info';
    
    const alertHtml = `
        <div id="customAlert" class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // 将提示插入到页面顶部
    document.querySelector('.app-container').insertAdjacentHTML('afterbegin', alertHtml);
    
    // 5秒后自动关闭提示
    setTimeout(() => {
        const alert = document.getElementById('customAlert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// 初始化相机功能
function initCameraFunctions() {
    const startCameraBtn = document.getElementById('startCameraBtn');
    const takePictureBtn = document.getElementById('takePictureBtn');
    const cameraPreview = document.getElementById('cameraPreview');
    const pictureCanvas = document.getElementById('pictureCanvas');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const capturedImageElement = document.getElementById('capturedImage');
    const capturedImageContainer = document.getElementById('capturedImageContainer');
    
    // 打开相机
    startCameraBtn.addEventListener('click', async function() {
        try {
            if (stream) {
                // 如果相机已经打开，则关闭它
                stream.getTracks().forEach(track => track.stop());
                stream = null;
                cameraPreview.classList.add('d-none');
                cameraPlaceholder.classList.remove('d-none');
                takePictureBtn.classList.add('d-none');
                startCameraBtn.innerHTML = '<i class="bi bi-camera-video me-1"></i>打开相机';
                startCameraBtn.classList.replace('btn-danger', 'btn-primary');
                return;
            }
            
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraPreview.srcObject = stream;
            cameraPreview.classList.remove('d-none');
            cameraPlaceholder.classList.add('d-none');
            takePictureBtn.classList.remove('d-none');
            startCameraBtn.innerHTML = '<i class="bi bi-camera-video-off me-1"></i>关闭相机';
            startCameraBtn.classList.replace('btn-primary', 'btn-danger');
        } catch (err) {
            console.error('无法访问相机: ', err);
            showAlert('无法访问相机，请确保您已授予相机访问权限。', 'danger');
        }
    });
    
    // 拍照
    takePictureBtn.addEventListener('click', function() {
        if (!stream) return;
        
        const context = pictureCanvas.getContext('2d');
        pictureCanvas.width = cameraPreview.videoWidth;
        pictureCanvas.height = cameraPreview.videoHeight;
        context.drawImage(cameraPreview, 0, 0, pictureCanvas.width, pictureCanvas.height);
        
        // 获取图片数据
        capturedImage = pictureCanvas.toDataURL('image/jpeg');
        capturedImageElement.src = capturedImage;
        capturedImageContainer.classList.remove('d-none');
        
        // 关闭相机
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        cameraPreview.classList.add('d-none');
        cameraPlaceholder.classList.remove('d-none');
        takePictureBtn.classList.add('d-none');
        startCameraBtn.innerHTML = '<i class="bi bi-camera-video me-1"></i>重新拍照';
        startCameraBtn.classList.replace('btn-danger', 'btn-primary');
    });
}

// 重置相机
function resetCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    const cameraPreview = document.getElementById('cameraPreview');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const takePictureBtn = document.getElementById('takePictureBtn');
    const startCameraBtn = document.getElementById('startCameraBtn');
    const capturedImageContainer = document.getElementById('capturedImageContainer');
    
    if (cameraPreview) cameraPreview.classList.add('d-none');
    if (cameraPlaceholder) cameraPlaceholder.classList.remove('d-none');
    if (takePictureBtn) takePictureBtn.classList.add('d-none');
    if (startCameraBtn) {
        startCameraBtn.innerHTML = '<i class="bi bi-camera-video me-1"></i>打开相机';
        startCameraBtn.classList.replace('btn-danger', 'btn-primary');
    }
    if (capturedImageContainer) capturedImageContainer.classList.add('d-none');
    
    capturedImage = null;
}

// 初始化文件上传
function initFileUpload() {
    const imageUpload = document.getElementById('imageUpload');
    const uploadedImageElement = document.getElementById('uploadedImage');
    const uploadedImageContainer = document.getElementById('uploadedImageContainer');
    
    imageUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // 检查文件类型
            if (!file.type.match('image.*')) {
                showAlert('请选择图片文件！', 'warning');
                this.value = '';
                return;
            }
            
            // 检查文件大小（限制为5MB）
            if (file.size > 5 * 1024 * 1024) {
                showAlert('图片大小不能超过5MB！', 'warning');
                this.value = '';
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                uploadedImage = e.target.result;
                uploadedImageElement.src = uploadedImage;
                uploadedImageContainer.classList.remove('d-none');
            };
            
            reader.readAsDataURL(file);
        }
    });
}

// 重置文件上传
function resetFileUpload() {
    const imageUpload = document.getElementById('imageUpload');
    const uploadedImageContainer = document.getElementById('uploadedImageContainer');
    
    if (imageUpload) imageUpload.value = '';
    if (uploadedImageContainer) uploadedImageContainer.classList.add('d-none');
    
    uploadedImage = null;
}

// 处理提交
async function handleSubmit() {
    // 获取当前选中的输入方式
    const activeTab = document.querySelector('.nav-link.active').id;
    let imageData = null;
    
    // 根据不同的输入方式获取内容
    if (activeTab === 'camera-tab') {
        if (!capturedImage) {
            showAlert('请先拍照！', 'warning');
            return;
        }
        imageData = capturedImage;
    } else if (activeTab === 'file-tab') {
        if (!uploadedImage) {
            showAlert('请先上传图片！', 'warning');
            return;
        }
        imageData = uploadedImage;
    }
    
    // 获取批改设置
    const grade = document.getElementById('gradeSelect').value;
    const title = "";
    const correctVersion = document.getElementById('correctionVersion').value;
    const isNeedSynonyms = document.getElementById('needSynonyms').checked;
    const isNeedEssayReport = document.getElementById('needEssayReport').checked;
    
    // 显示结果容器和加载指示器
    const resultContainer = document.getElementById('resultContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultContent = document.getElementById('resultContent');
    
    resultContainer.classList.remove('d-none');
    loadingIndicator.classList.remove('d-none');
    resultContent.classList.add('d-none');
    
    try {
        // 准备请求数据
        const data = new FormData();
        
        // 添加通用参数
        data.append('grade', grade);
        data.append('title', title);
        data.append('isNeedSynonyms', isNeedSynonyms);
        data.append('correctVersion', correctVersion);
        data.append('isNeedEssayReport', isNeedEssayReport);
        
        // 添加图片数据
        const base64Data = imageData.split(',')[1];
        data.append('q', base64Data);
        
        // 检查API密钥是否已设置
        if (!APP_KEY || !APP_SECRET) {
            throw new Error('请先在app.js文件中设置您的应用ID和密钥');
        }
        
        // 添加API认证参数
        const salt = generateUUID();
        const curtime = Math.round(new Date().getTime() / 1000);
        const q = data.get('q') || '';
        const sign = await sha256(APP_KEY + truncate(q) + salt + curtime + APP_SECRET);
        
        data.append('appKey', APP_KEY);
        data.append('salt', salt);
        data.append('curtime', curtime);
        data.append('signType', 'v3');
        data.append('sign', sign);
        
        // 显示加载状态
        showAlert('正在提交批改请求，请稍候...', 'info');
        
        // 使用代理URL解决跨域问题
        const response = await axios.post(REQUEST_URL, data);
        
        const result = response.data;
        
        // 处理并显示结果
        displayResult(result);
        
        // 显示成功消息
        showAlert('批改完成！', 'success');
    } catch (error) {
        console.error('API请求失败:', error);
        resultContent.innerHTML = `
            <div class="alert alert-danger">
                <h4>请求失败</h4>
                <p>${error.message || '未知错误'}</p>
                <p>请检查网络连接和API配置后重试。</p>
            </div>
        `;
        loadingIndicator.classList.add('d-none');
        resultContent.classList.remove('d-none');
        
        // 显示错误消息
        showAlert(`请求失败: ${error.message || '未知错误'}`, 'danger');
    }
}

// 处理输入文本，如果超过20个字符，则截取前10个和后10个，中间用长度代替
function truncate(text) {
    if (!text) return '';
    const len = text.length;
    if (len <= 20) return text;
    return text.substring(0, 10) + len + text.substring(len - 10);
}

// 展开/收起详情
function toggleDetails(button) {
    const detailsElement = button.parentElement.nextElementSibling;
    if (detailsElement.style.display === 'none') {
        detailsElement.style.display = 'block';
        button.innerHTML = '收起 <i class="bi bi-chevron-up"></i>';
    } else {
        detailsElement.style.display = 'none';
        button.innerHTML = '详情 <i class="bi bi-chevron-down"></i>';
    }
}

function toggleCorrection(correctionId) {
    const correctionItem = document.getElementById(correctionId);
    const content = document.getElementById(`correction-content-${correctionId}`);
    const icon = document.getElementById(`toggle-icon-${correctionId}`);
    
    if (correctionItem.classList.contains('expanded')) {
        correctionItem.classList.remove('expanded');
        content.style.display = 'none';
        icon.textContent = '▶';
    } else {
        correctionItem.classList.add('expanded');
        content.style.display = 'block';
        icon.textContent = '▼';
    }
}

// 生成UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// SHA256 哈希函数
async function sha256(message) {
    // 使用 SubtleCrypto API 计算 SHA-256 哈希
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 显示批改结果
function displayResult(result) {
    const resultContent = document.getElementById('resultContent');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    // 检查API返回是否有错误
    if (result.errorCode !== '0') {
        resultContent.innerHTML = `
            <div class="alert alert-danger">
                <h4>API返回错误</h4>
                <p>错误码: ${result.errorCode}</p>
                <p>错误信息: ${result.errorMsg || '未知错误'}</p>
                <p>请检查API配置和参数后重试。</p>
            </div>
        `;
        loadingIndicator.classList.add('d-none');
        resultContent.classList.remove('d-none');
        return;
    }
    
    // 获取结果数据
    const data = result.Result;
    
    // 构建结果HTML
    let html = `
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body text-center">
                        <div class="score-display">${data.totalScore}</div>
                        <div class="score-label">总分 (满分${data.fullScore})</div>
                    </div>
                </div>
            </div>
            <div class="col-md-8">
                <div class="evaluation-box">
                    <h4>总体评价</h4>
                    <p class="mb-0">${data.totalEvaluation}</p>
                    <p>${data.essayAdvice || ''}</p>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <div class="score-display">${data.majorScore.grammarScore.toFixed(1)}</div>
                                <div class="score-label">语法得分</div>
                                <div class="score-advice">${data.majorScore.grammarAdvice || ''}</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <div class="score-display">${data.majorScore.wordScore.toFixed(1)}</div>
                                <div class="score-label">词汇得分</div>
                                <div class="score-advice">${data.majorScore.wordAdvice || ''}</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <div class="score-display">${data.majorScore.structureScore.toFixed(1)}</div>
                                <div class="score-label">结构得分</div>
                                <div class="score-advice">${data.majorScore.structureAdvice || ''}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card mb-4">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-journal-text me-2"></i>作文内容</h5>
            </div>
            <div class="card-body">
                <p>${data.rawEssay.replace(/\n/g, '<br>')}</p>
            </div>
        </div>
        
        <div class="card mb-4">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-pencil-square me-2"></i>详细批改</h5>
            </div>
            <div class="card-body">
                <div class="suggestion-list clearfix">
                    <div class="suggestion-list-header">
                        <h6 class="mb-0">所有纠错</h6>
                        <span class="count" id="error-count">0</span>
                    </div>
    `;
    
    // 错误计数器
    let errorCount = 0;
    
    // 添加每个句子的批改结果
    data.essayFeedback.sentsFeedback.forEach((sent, index) => {
        // 只显示有错误或同义词推荐的句子
        if ((sent.errorPosInfos && sent.errorPosInfos.length > 0) || 
            (sent.synInfo && sent.synInfo.length > 0)) {
            
            // 显示原句标题
            html += `<div style="margin: 20px 0 10px 0; padding: 10px; background: #e9ecef; border-radius: 6px;">`;
            html += `<strong>原句 ${index + 1}:</strong> ${sent.rawSent}`;
            html += `</div>`;
            
            // 如果有错误，显示错误信息和修改建议
            if (sent.errorPosInfos && sent.errorPosInfos.length > 0) {
                sent.errorPosInfos.forEach((error, errorIndex) => {
                    // 高级批改特有的错误显示
                    const showAdvanced = document.getElementById('correctionVersion').value === 'advanced';
                    errorCount++;
                    
                    // 使用新的列表样式展示修改建议
                    let correctChunkDisplay = error.correctChunk;
                    
                    // 处理JSON格式的大小写建议
                    if (typeof error.correctChunk === 'string' && error.correctChunk.startsWith('{')) {
                        try {
                            const jsonObj = JSON.parse(error.correctChunk);
                            if (jsonObj.capitalize) {
                                correctChunkDisplay = jsonObj.capitalize;
                            } else if (jsonObj.lower) {
                                correctChunkDisplay = jsonObj.lower;
                            }
                        } catch (e) {
                            // 如果解析失败，直接显示原始值
                        }
                    }
                    
                    const correctionId = `correction-${index}-${errorIndex}`;
                    
                    let errorHtml = `
                        <div class="correction-item" id="${correctionId}">
                            <div class="correction-header" onclick="toggleCorrection('${correctionId}')">
                                <div class="correction-content">
                                    <div class="correction-number">${errorCount}</div>
                                    <div class="correction-type">${error.errorTypeTitle}</div>
                                    <div class="word-change">
                                        <span class="original-word">${error.orgChunk}</span>
                                        <span class="arrow">→</span>
                                        <span class="corrected-word">${error.errorTypeTitle === '大小写不统一' ? 'Dream' : correctChunkDisplay}</span>
                                    </div>
                                </div>
                                <div class="toggle-icon" id="toggle-icon-${correctionId}">▶</div>
                            </div>
                            <div class="correction-details" id="correction-content-${correctionId}" style="display: none;">
                                <div class="detail-section">
                                    <div class="detail-title">错误说明</div>
                                    <div class="detail-content">${error.detailReason || '无详细说明'}</div>
                                </div>`;
                    
                    if (showAdvanced && error.exampleCases && error.exampleCases.length > 0) {
                        errorHtml += `
                                <div class="detail-section">
                                    <div class="detail-title">示例对比</div>
                                    <div class="detail-content">`;
                        error.exampleCases.forEach(example => {
                            errorHtml += `
                                <div style="margin-bottom: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                                    <div style="color: #dc3545; margin-bottom: 4px;">❌ ${example.error}</div>
                                    <div style="color: #28a745; margin-bottom: 4px;">✅ ${example.right}</div>
                                    ${example.rightTranslate ? `<div style="color: #6c757d; font-size: 12px;">${example.rightTranslate}</div>` : ''}
                                </div>
                            `;
                        });
                        errorHtml += `
                                    </div>
                                </div>`;
                    }
                    
                    if (showAdvanced && error.knowledgeExp) {
                        errorHtml += `
                                <div class="detail-section">
                                    <div class="detail-title">语法点解释</div>
                                    <div class="detail-content">${error.knowledgeExp}</div>
                                </div>`;
                    }
                    
                    errorHtml += `
                            </div>
                        </div>`;
                    html += errorHtml;
                });
            }
            
            // 如果有同义词推荐
            if (sent.synInfo && sent.synInfo.length > 0) {
                sent.synInfo.forEach((syn, synIndex) => {
                    errorCount++;
                    const originalWord = syn.source[0].word;
                    const correctionId = `synonym-${index}-${synIndex}`;
                    
                    let synHtml = `
                        <div class="correction-item" id="${correctionId}">
                            <div class="correction-header" onclick="toggleCorrection('${correctionId}')">
                                <div class="correction-content">
                                    <div class="correction-number">${errorCount}</div>
                                    <div class="correction-type">同义词推荐</div>
                                    <div class="word-change">
                                        <span class="original-word">${originalWord}</span>
                                        <span class="arrow">→</span>
                                        <span class="corrected-word">${syn.target[0][0].word}</span>
                                    </div>
                                </div>
                                <div class="toggle-icon" id="toggle-icon-${correctionId}">▶</div>
                            </div>
                            <div class="correction-details" id="correction-content-${correctionId}" style="display: none;">
                                <div class="detail-section">
                                    <div class="detail-title">词性说明</div>
                                    <div class="detail-content">${syn.sourcePos}${syn.sourceTran ? ` - ${syn.sourceTran}` : ''}</div>
                                </div>
                                <div class="detail-section">
                                    <div class="detail-title">替换建议</div>
                                    <div class="detail-content">`;
                    
                    syn.target.forEach((target, i) => {
                        const word = target[0].word;
                        const trans = target[0].tran;
                        synHtml += `
                            <div style="margin-bottom: 8px; padding: 6px; background: #f8f9fa; border-radius: 4px; display: inline-block; margin-right: 8px;">
                                <span style="font-weight: 500; color: #28a745;">${word}</span>
                                ${trans ? `<span style="color: #6c757d; font-size: 12px; margin-left: 4px;">(${trans})</span>` : ''}
                            </div>
                        `;
                    });
                    
                    synHtml += `
                                    </div>
                                </div>
                            </div>
                        </div>`;
                    html += synHtml;
                });
            }
            
            html += `</div>`;
        }
    });
    
    // 更新错误计数
    html += `</div>`;
    
    // 在DOM加载完成后更新错误计数
    setTimeout(() => {
        const errorCountElement = document.getElementById('error-count');
        if (errorCountElement) {
            errorCountElement.textContent = errorCount;
        }
    }, 100);
    
    html += `</div></div>`;

    // 如果是高级版本且有写作报告
    if (document.getElementById('correctionVersion').value === 'advanced' && 
        document.getElementById('needEssayReport').checked &&
        data.essayReport) {
        html += generateEssayReport(data.essayReport);
    }
    
    html += '</div></div>';

    // 显示结果
    resultContent.innerHTML = html;
    loadingIndicator.classList.add('d-none');
    resultContent.classList.remove('d-none');
    
    // 滚动到结果区域
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

// 生成写作报告HTML
function generateEssayReport(report) {
    return `
        <div class="card mt-4">
            <div class="card-header">
                <h5><i class="bi bi-clipboard-data me-2"></i>写作报告分析</h5>
            </div>
            <div class="card-body">
                <div class="report-section">
                    <h6><i class="bi bi-bar-chart me-2"></i>基本统计</h6>
                    <ul>
                        <li>单词数：${report.wordNum}</li>
                        <li>句子数：${report.sentNum}</li>
                        <li>段落数：${report.paraNum}</li>
                        <li>平均句长：${report.avgSentLen.toFixed(1)}</li>
                        <li>可读性得分：${report.readability}</li>
                    </ul>
                </div>

                <div class="report-section">
                    <h6><i class="bi bi-exclamation-triangle me-2"></i>语法错误分析</h6>
                    <p>${report.grammarErrorAdvice.evaluation}</p>
                    <p>主要错误类型：${report.grammarErrorAdvice.highFreqErrors.join('、')}</p>
                    <ul>
                        ${report.grammarErrorAdvice.errors.map(error => `
                            <li>${error.name}：${error.count} 处 (${(error.percent * 100).toFixed(1)}%)</li>
                        `).join('')}
                    </ul>
                </div>

                <div class="report-section">
                    <h6><i class="bi bi-link-45deg me-2"></i>逻辑连接词分析</h6>
                    <p>${report.conjAdvice.original.replace(/%s/g, (_, i) => report.conjAdvice.fillers[i])}</p>
                    <ul>
                        ${report.conjTypeInfos.map(conj => `
                            <li>${conj.name}：${conj.count} 处 (${(conj.percent * 100).toFixed(1)}%)</li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="report-section">
                    <h6><i class="bi bi-diagram-3 me-2"></i>句子结构分析</h6>
                    <p>${report.sentComplexInfo.sentenceStructureAdvice}</p>
                    <ul>
                        <li>简单句：${report.sentComplexInfo.simpleSentNum}句 (${(report.sentComplexInfo.simpleSentPercent * 100).toFixed(1)}%)</li>
                        <li>复杂句：${report.sentComplexInfo.complexSentNum}句 (${(report.sentComplexInfo.complexSentPercent * 100).toFixed(1)}%)</li>
                    </ul>
                </div>

                <div class="report-section">
                    <h6><i class="bi bi-book me-2"></i>词汇水平分布</h6>
                    <p>${report.lexicalDistribution.advice}</p>
                    <ul>
                        <li>考研水平：${(report.lexicalDistribution.toeflAndIeltsWordNumPercent * 100).toFixed(1)}%</li>
                        <li>高级词汇：${(report.lexicalDistribution.cet6WordNumPercent * 100).toFixed(1)}%</li>
                        <li>中级词汇：${(report.lexicalDistribution.cet4WordNumPercent * 100).toFixed(1)}%</li>
                        <li>基础词汇：${((report.lexicalDistribution.juniorWordNumPercent + report.lexicalDistribution.primaryWordNumPercent) * 100).toFixed(1)}%</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

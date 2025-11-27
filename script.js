// Cấu hình GitHub cho project site "bs"
const GITHUB_USERNAME = 'qiu2zhi1zhe3';
const GITHUB_REPO = 'bs';
const DATA_FILE_PATH = 'data.txt';

let data = [];
let githubToken = localStorage.getItem('githubToken');

// Hàm lấy base URL cho project site
function getBaseUrl() {
    return `https://${GITHUB_USERNAME}.github.io/${GITHUB_REPO}`;
}

// Tab functions
function openTab(tabName) {
    // Ẩn tất cả tab content
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    // Bỏ active tất cả tab buttons
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }
    
    // Hiển thị tab được chọn và active button
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Active button tương ứng
    const buttons = document.getElementsByClassName('tab-button');
    for (let button of buttons) {
        if (button.textContent.includes(tabName === 'searchTab' ? 'Tìm kiếm' : 'Thêm dữ liệu')) {
            button.classList.add('active');
        }
    }
    
    // Nếu là tab thêm dữ liệu, load preview
    if (tabName === 'addTab') {
        setTimeout(loadPreviewData, 100);
    }
}

// Load preview data
function loadPreviewData() {
    const previewContent = document.getElementById('dataPreview');
    previewContent.innerHTML = 'Đang tải dữ liệu...';
    
    fetch('data.txt' + '?t=' + new Date().getTime())
        .then(response => response.text())
        .then(text => {
            const lines = text.split('\n').filter(line => line.trim() !== '');
            if (lines.length === 0) {
                previewContent.innerHTML = 'Chưa có dữ liệu';
            } else {
                previewContent.innerHTML = lines.join('<br>');
            }
        })
        .catch(error => {
            previewContent.innerHTML = 'Lỗi khi tải dữ liệu: ' + error.message;
        });
}

// Load dữ liệu từ file TXT
async function loadData() {
    try {
        const response = await fetch('data.txt' + '?t=' + new Date().getTime());
        const text = await response.text();
        
        data = text.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => {
                const parts = line.split('.');
                if (parts.length >= 3) {
                    return {
                        fullText: line.trim(),
                        ch: parts[0], // CH
                        bs: parts[1].split(' ').map(bs => bs.trim()).filter(bs => bs !== ''), // BS (cách nhau bằng dấu cách)
                        more: parts.slice(2).join('.') // More
                    };
                }
                return {
                    fullText: line.trim(),
                    ch: '',
                    bs: [],
                    more: line.trim()
                };
            });
        
        console.log('Đã load', data.length, 'dòng dữ liệu');
    } catch (error) {
        console.error('Lỗi khi load dữ liệu:', error);
        showMessage('Lỗi khi tải dữ liệu: ' + error.message, 'error');
    }
}

// Hàm tìm kiếm
function searchData() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('results');
    const noResults = document.getElementById('noResults');
    const resultCount = document.getElementById('resultCount');
    
    resultsContainer.innerHTML = '';
    
    if (searchTerm === '') {
        noResults.style.display = 'block';
        resultCount.textContent = '0 kết quả';
        return;
    }
    
    const filteredData = data.filter(item => {
        const searchInFullText = item.fullText.toLowerCase().includes(searchTerm);
        const searchInCH = item.ch.toLowerCase().includes(searchTerm);
        const searchInBS = item.bs.some(bs => bs.toLowerCase().includes(searchTerm));
        const searchInMore = item.more.toLowerCase().includes(searchTerm);
        
        return searchInFullText || searchInCH || searchInBS || searchInMore;
    });
    
    if (filteredData.length > 0) {
        filteredData.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            let highlightedText = highlightText(item.fullText, searchTerm);
            
            resultItem.innerHTML = `
                <div class="result-info">${highlightedText}</div>
            `;
            
            resultsContainer.appendChild(resultItem);
        });
        
        noResults.style.display = 'none';
        resultCount.textContent = `${filteredData.length} kết quả`;
    } else {
        noResults.style.display = 'block';
        resultCount.textContent = '0 kết quả';
    }
}

// Hàm thêm dữ liệu mới - Phiên bản đơn giản
async function addNewData() {
    let ch = document.getElementById('newCode').value.trim().toUpperCase();
    let bsInput = document.getElementById('newSubCode').value.trim().toUpperCase();
    let more = document.getElementById('newName').value.trim();

    if (!ch || !bsInput) {
        showMessage('Vui lòng điền đầy đủ CH và ít nhất một BS', 'error');
        return;
    }

    if (!githubToken) {
        showTokenModal();
        return;
    }

    const bsArray = bsInput.split(' ')
        .map(bs => bs.trim())
        .filter(bs => bs !== '');

    if (bsArray.length === 0) {
        showMessage('Vui lòng nhập ít nhất một BS', 'error');
        return;
    }

    try {
        showMessage('Đang xử lý dữ liệu...', 'success');
        
        const fileInfo = await getFileInfo();
        let lines = fileInfo.content.split('\n').filter(line => line.trim() !== '');
        
        // BƯỚC 1: Xóa BS trùng từ các dòng khác (không xóa cả dòng)
        lines = lines.map(line => {
            const parts = line.split('.');
            if (parts.length >= 2 && parts[0].toLowerCase() !== ch.toLowerCase()) {
                const existingBS = parts[1].split(' ').map(bs => bs.trim()).filter(bs => bs !== '');
                const existingMore = parts.slice(2).join('.');
                
                // Lọc ra các BS không trùng
                const remainingBS = existingBS.filter(existingBs => 
                    !bsArray.some(newBs => newBs.toLowerCase() === existingBs.toLowerCase())
                );
                
                if (remainingBS.length > 0) {
                    // Còn BS thì giữ dòng
                    return existingMore ? 
                        `${parts[0]}.${remainingBS.join(' ')}.${existingMore}` : 
                        `${parts[0]}.${remainingBS.join(' ')}`;
                } else {
                    // Không còn BS thì xóa dòng
                    return null;
                }
            }
            return line;
        }).filter(line => line !== null);
        
        // BƯỚC 2: Thêm/gộp dữ liệu mới
        let existingLineIndex = lines.findIndex(line => 
            line.split('.')[0].toLowerCase() === ch.toLowerCase()
        );
        
        let newEntry;
        if (existingLineIndex !== -1) {
            // Gộp với dòng có CH trùng
            const parts = lines[existingLineIndex].split('.');
            const existingBS = parts[1].split(' ').map(bs => bs.trim()).filter(bs => bs !== '');
            const existingMore = parts.slice(2).join('.');
            
            const mergedBS = [...new Set([...existingBS, ...bsArray])];
            const mergedMore = more && !existingMore.includes(more) ? 
                (existingMore ? `${existingMore} ${more}` : more) : existingMore;
            
            newEntry = mergedMore ? `${ch}.${mergedBS.join(' ')}.${mergedMore}` : `${ch}.${mergedBS.join(' ')}`;
            lines[existingLineIndex] = newEntry;
        } else {
            // Thêm dòng mới
            newEntry = more ? `${ch}.${bsArray.join(' ')}.${more}` : `${ch}.${bsArray.join(' ')}`;
            lines.push(newEntry);
        }
        
        // Cập nhật file
        await updateFile(lines.join('\n'), fileInfo.sha);
        
        showMessage('✅ Đã thêm thông tin thành công! Bạn có thể thêm tiếp.', 'success');
        clearForm(); // Chỉ xóa form, không refresh trang
        
        // Cập nhật dữ liệu nền
        setTimeout(() => {
            loadData();
            loadPreviewData();
        }, 1500);
        
    } catch (error) {
        console.error('Lỗi khi thêm dữ liệu:', error);
        showMessage('❌ Lỗi: ' + error.message, 'error');
    }
}


// Hàm lấy thông tin file
async function getFileInfo() {
    if (!githubToken) {
        throw new Error('Chưa có GitHub Token. Vui lòng cung cấp token.');
    }

    const response = await fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`,
        {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'BS-Data-Manager'
            }
        }
    );

    if (!response.ok) {
        if (response.status === 404) {
            // File không tồn tại, tạo file mới
            return await createNewFile();
        } else if (response.status === 401) {
            throw new Error('Token không hợp lệ hoặc hết hạn. Vui lòng tạo token mới.');
        } else if (response.status === 403) {
            throw new Error('Token không đủ quyền hoặc bị giới hạn rate limit.');
        } else {
            const errorData = await response.text();
            throw new Error(`Lỗi GitHub API: ${response.status} - ${errorData}`);
        }
    }

    const fileData = await response.json();
    return {
        content: decodeBase64(fileData.content),
        sha: fileData.sha
    };
}

// Hàm tạo file mới nếu chưa tồn tại
async function createNewFile() {
    const response = await fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Tạo file data.txt mới',
                content: encodeBase64('# Dữ liệu bắt đầu\nC11708.38A-40773 38A-11106.Nguyễn Quang Thọ')
            })
        }
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Không thể tạo file mới: ${errorData.message}`);
    }

    return {
        content: '# Dữ liệu bắt đầu\nC11708.38A-40773 38A-11106.Nguyễn Quang Thọ',
        sha: (await response.json()).content.sha
    };
}

// Hàm cập nhật file
async function updateFile(content, sha) {
    const response = await fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Cập nhật dữ liệu: ${new Date().toLocaleString('vi-VN')}`,
                content: encodeBase64(content),
                sha: sha
            })
        }
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Lỗi khi cập nhật file');
    }

    return true;
}

// Hàm giải mã base64
function decodeBase64(str) {
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch (e) {
        return atob(str);
    }
}

// Hàm mã hóa base64
function encodeBase64(str) {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        return btoa(str);
    }
}

// Hàm highlight text
function highlightText(text, searchTerm) {
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Các hàm UI
function showTokenModal() {
    document.getElementById('tokenModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('tokenModal').style.display = 'none';
}

function saveToken() {
    const token = document.getElementById('githubToken').value.trim();
    if (token) {
        githubToken = token;
        localStorage.setItem('githubToken', token);
        closeModal();
        showMessage('✅ Đã lưu token thành công!', 'success');
    }
}

function showMessage(message, type) {
    const messageEl = document.getElementById('addMessage');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

function clearForm() {
    document.getElementById('newCode').value = '';
    document.getElementById('newSubCode').value = '';
    document.getElementById('newName').value = '';
}

function refreshData() {
    loadData();
}

// Event listeners
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchData();
    }
});

let searchTimeout;
document.getElementById('searchInput').addEventListener('input', function(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(searchData, 300);
});

// Auto uppercase cho input
document.getElementById('newCode').addEventListener('input', function(e) {
    this.value = this.value.toUpperCase();
});

document.getElementById('newSubCode').addEventListener('input', function(e) {
    this.value = this.value.toUpperCase();
});

// Load dữ liệu khi trang được tải
window.addEventListener('DOMContentLoaded', function() {
    loadData();
    openTab('searchTab');
});

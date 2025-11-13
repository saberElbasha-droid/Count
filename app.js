// متغيرات التطبيق
let items = [];
let html5QrCode = null;
let currentQRCode = '';
const targetCount = 20;
let isScanning = false;

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    console.log('بدء تحميل التطبيق...');
    initializeApp();
});

function initializeApp() {
    // تعيين الهدف
    document.getElementById('targetCount').textContent = targetCount;
    
    // تحميل البيانات المحفوظة
    loadItemsFromStorage();
    updateItemsList();
    updateSaveStatus();
    
    // التحقق من المكتبات
    checkLibraries();
    
    // إعداد استيراد الملفات
    document.getElementById('fileInput').addEventListener('change', handleFileImport);
}

// التحقق من تحميل المكتبات
function checkLibraries() {
    const statusElement = document.getElementById('statusMessage');
    const startScannerBtn = document.getElementById('startScannerBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    
    // التحقق من مكتبة QR
    if (typeof Html5Qrcode === 'undefined') {
        statusElement.innerHTML = '❌ مشكلة في تحميل مكتبة QR. الرجاء إعادة تحميل الصفحة.';
        statusElement.className = 'status-box error';
        startScannerBtn.disabled = true;
        refreshBtn.style.display = 'block';
        return false;
    }
    
    // التحقق من مكتبة Excel
    if (typeof XLSX === 'undefined') {
        statusElement.innerHTML = '⚠️ مشكلة في تحميل مكتبة Excel (لا يزال المسح يعمل)';
        statusElement.className = 'status-box error';
        refreshBtn.style.display = 'block';
        return false;
    }
    
    // كل شيء يعمل
    statusElement.innerHTML = '✅ التطبيق جاهز للاستخدام!';
    statusElement.className = 'status-box success';
    startScannerBtn.disabled = false;
    
    // إخفاء الرسالة بعد 3 ثوان
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
    
    return true;
}

// إعادة تحميل الصفحة
function refreshPage() {
    location.reload();
}

// بدء المسح الضوئي
async function startScanner() {
    if (isScanning) {
        return;
    }
    
    const startScannerBtn = document.getElementById('startScannerBtn');
    const readerElement = document.getElementById('reader');
    const statusElement = document.getElementById('statusMessage');
    
    startScannerBtn.disabled = true;
    startScannerBtn.textContent = 'جاري التشغيل...';
    
    try {
        // إظهار الماسح
        readerElement.classList.add('active');
        
        // الحصول على الكاميرات
        const cameras = await Html5Qrcode.getCameras();
        
        if (cameras.length === 0) {
            throw new Error('لا توجد كاميرات متاحة');
        }
        
        // استخدام الكاميرا الأولى
        const cameraId = cameras[0].id;
        
        // تهيئة الماسح
        html5QrCode = new Html5Qrcode("reader");
        
        // بدء المسح
        await html5QrCode.start(
            cameraId,
            {
                fps: 10,
                qrbox: { width: 200, height: 200 }
            },
            onScanSuccess,
            onScanFailure
        );
        
        isScanning = true;
        startScannerBtn.textContent = 'إيقاف المسح';
        startScannerBtn.disabled = false;
        startScannerBtn.onclick = stopScanner;
        
        statusElement.style.display = 'block';
        statusElement.innerHTML = '✅ الكاميرا تعمل - وجه نحو QR code';
        statusElement.className = 'status-box success';
        
    } catch (error) {
        console.error('خطأ في المسح:', error);
        
        let errorMessage = 'خطأ في تشغيل الكاميرا: ';
        if (error.message.includes('Permission')) {
            errorMessage = '⛔ يرجى السماح باستخدام الكاميرا';
        } else if (error.message.includes('كاميرات')) {
            errorMessage = '📵 لا توجد كاميرا';
        } else {
            errorMessage += error.message;
        }
        
        statusElement.style.display = 'block';
        statusElement.innerHTML = errorMessage;
        statusElement.className = 'status-box error';
        
        resetScanner();
    }
}

// إيقاف المسح الضوئي
async function stopScanner() {
    if (!html5QrCode || !isScanning) return;
    
    try {
        await html5QrCode.stop();
        isScanning = false;
        resetScanner();
    } catch (error) {
        console.error('خطأ في إيقاف المسح:', error);
        isScanning = false;
        resetScanner();
    }
}

// إعادة تعيين الماسح
function resetScanner() {
    const startScannerBtn = document.getElementById('startScannerBtn');
    const readerElement = document.getElementById('reader');
    
    readerElement.classList.remove('active');
    startScannerBtn.disabled = false;
    startScannerBtn.textContent = 'بدء المسح';
    startScannerBtn.onclick = startScanner;
    
    document.getElementById('statusMessage').style.display = 'none';
}

// عند نجاح المسح
function onScanSuccess(decodedText) {
    console.log('تم مسح:', decodedText);
    currentQRCode = decodedText;
    
    stopScanner().then(() => {
        showItemForm(decodedText);
    });
}

// عند فشل المسح
function onScanFailure(error) {
    // تجاهل الأخطاء العادية
}

// عرض نموذج إدخال الكمية
function showItemForm(itemName) {
    const formElement = document.getElementById('itemForm');
    document.getElementById('itemName').value = itemName;
    formElement.classList.add('active');
    document.getElementById('quantityInput').focus();
    
    const statusElement = document.getElementById('statusMessage');
    statusElement.style.display = 'block';
    statusElement.innerHTML = `✅ تم مسح: ${itemName}`;
    statusElement.className = 'status-box success';
}

// إضافة صنف
function addItem() {
    const quantityInput = document.getElementById('quantityInput');
    const quantity = quantityInput.value;
    
    if (!quantity || quantity < 1) {
        alert('يرجى إدخال كمية صحيحة');
        quantityInput.focus();
        return;
    }
    
    // البحث عن الصنف إذا كان موجوداً
    const existingIndex = items.findIndex(item => item.name === currentQRCode);
    
    if (existingIndex !== -1) {
        // تحديث الكمية
        items[existingIndex].quantity += parseInt(quantity);
        items[existingIndex].timestamp = new Date().toLocaleString('ar-EG');
    } else {
        // إضافة جديد
        items.push({
            name: currentQRCode,
            quantity: parseInt(quantity),
            timestamp: new Date().toLocaleString('ar-EG')
        });
    }
    
    // حفظ وتحديث
    saveItemsToStorage();
    updateItemsList();
    updateSaveStatus();
    
    // إعادة التعيين
    quantityInput.value = '';
    document.getElementById('itemForm').classList.remove('active');
    document.getElementById('statusMessage').style.display = 'none';
    
    // التحقق من الهدف
    if (items.length >= targetCount) {
        setTimeout(() => {
            if (confirm(`تهانينا! وصلت إلى ${targetCount} صنف. هل تريد تصدير Excel؟`)) {
                exportToExcel();
            }
        }, 500);
    }
}

// إلغاء الإضافة
function cancelAddItem() {
    document.getElementById('itemForm').classList.remove('active');
    document.getElementById('quantityInput').value = '';
    document.getElementById('statusMessage').style.display = 'none';
}

// تحديث قائمة الأصناف
function updateItemsList() {
    const itemsList = document.getElementById('itemsList');
    const itemsCount = document.getElementById('itemsCount');
    
    itemsCount.textContent = items.length;
    
    if (items.length === 0) {
        itemsList.innerHTML = '<div class="empty-state">لا توجد أصناف مضافة بعد</div>';
        return;
    }
    
    let html = '';
    items.forEach((item, index) => {
        html += `
            <div class="item">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-quantity">الكمية: ${item.quantity}</div>
                    <div class="item-time">${item.timestamp}</div>
                </div>
                <button class="delete-btn" onclick="deleteItem(${index})">حذف</button>
            </div>
        `;
    });
    
    itemsList.innerHTML = html;
}

// حذف صنف
function deleteItem(index) {
    if (confirm('هل تريد حذف هذا الصنف؟')) {
        items.splice(index, 1);
        saveItemsToStorage();
        updateItemsList();
        updateSaveStatus();
    }
}

// تصدير Excel
function exportToExcel() {
    if (items.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
    }
    
    try {
        const data = items.map(item => [item.name, item.quantity, item.timestamp]);
        data.unshift(['اسم الصنف', 'الكمية', 'الوقت']);
        
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'المخزون');
        
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `المخزون_${date}.xlsx`);
        
        showTempMessage('✅ تم التصدير بنجاح');
    } catch (error) {
        alert('خطأ في التصدير: ' + error.message);
    }
}

// تصدير نسخة احتياطية
function exportBackup() {
    if (items.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
    }
    
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `نسخة_احتياطية_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showTempMessage('✅ تم النسخ الاحتياطي');
}

// استيراد بيانات
function importBackup() {
    document.getElementById('fileInput').click();
}

// معالجة استيراد الملف
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                if (confirm(`سيتم استبدال ${items.length} صنف بـ ${imported.length} صنف. متابعة؟`)) {
                    items = imported;
                    saveItemsToStorage();
                    updateItemsList();
                    updateSaveStatus();
                    showTempMessage(`✅ تم استيراد ${items.length} صنف`);
                }
            } else {
                alert('ملف غير صالح');
            }
        } catch (error) {
            alert('خطأ في قراءة الملف');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// عرض رسالة مؤقتة
function showTempMessage(message) {
    const statusElement = document.getElementById('statusMessage');
    statusElement.style.display = 'block';
    statusElement.innerHTML = message;
    statusElement.className = 'status-box success';
    
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

// تحديث حالة الحفظ
function updateSaveStatus() {
    const lastSave = localStorage.getItem('lastSave');
    if (lastSave) {
        const date = new Date(lastSave);
        document.getElementById('lastSaveTime').textContent = date.toLocaleString('ar-EG');
    }
}

// حفظ البيانات
function saveItemsToStorage() {
    try {
        localStorage.setItem('inventoryItems', JSON.stringify(items));
        localStorage.setItem('lastSave', new Date().toISOString());
    } catch (error) {
        console.error('خطأ في الحفظ:', error);
    }
}

// تحميل البيانات
function loadItemsFromStorage() {
    try {
        const saved = localStorage.getItem('inventoryItems');
        if (saved) {
            items = JSON.parse(saved);
        }
    } catch (error) {
        console.error('خطأ في التحميل:', error);
        items = [];
    }
}

// حفظ عند إغلاق الصفحة
window.addEventListener('beforeunload', function() {
    if (isScanning) {
        stopScanner();
    }
    saveItemsToStorage();
});

// حفظ كل دقيقة
setInterval(() => {
    if (items.length > 0) {
        saveItemsToStorage();
        updateSaveStatus();
    }
}, 60000);

// متغيرات التطبيق
let items = [];
let html5QrCode = null;
let currentQRCode = '';
const targetCount = 20;
let isScanning = false;
let librariesLoaded = false;

// تهيئة التطبيق بعد تحميل الصفحة بالكامل
window.addEventListener('load', function() {
    console.log('الصفحة محملة بالكامل');
    initializeApp();
});

function initializeApp() {
    document.getElementById('targetCount').textContent = targetCount;
    loadItemsFromStorage();
    updateItemsList();
    updateSaveStatus();
    
    // التحقق من تحميل المكتبات كل ثانية لمدة 10 ثوان
    checkLibrariesRepeatedly();
}

// التحقق المتكرر من المكتبات
function checkLibrariesRepeatedly() {
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkInterval = setInterval(() => {
        attempts++;
        const qrLoaded = typeof Html5Qrcode !== 'undefined';
        const excelLoaded = typeof XLSX !== 'undefined';
        
        console.log(`محاولة ${attempts}: QR: ${qrLoaded}, Excel: ${excelLoaded}`);
        
        if (qrLoaded && excelLoaded) {
            clearInterval(checkInterval);
            librariesLoaded = true;
            enableScannerButton();
            showCameraStatus('✅ تم تحميل جميع المكتبات بنجاح!', 'success');
            setTimeout(() => {
                document.getElementById('cameraStatus').innerHTML = '';
                document.getElementById('cameraStatus').className = 'camera-status';
            }, 3000);
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            showCameraStatus(
                '❌ تعذر تحميل المكتبات. تأكد من اتصال الإنترنت ثم اضغط "إعادة تحميل المكتبات"',
                'error'
            );
            document.getElementById('refreshLibsBtn').classList.remove('hidden');
        }
    }, 1000);
}

// إعادة تحميل المكتبات
function refreshLibraries() {
    showCameraStatus('🔄 جاري إعادة تحميل المكتبات...', 'info');
    document.getElementById('refreshLibsBtn').classList.add('hidden');
    document.getElementById('startScannerBtn').disabled = true;
    document.getElementById('startScannerBtn').textContent = '⏳ جاري التحميل...';
    
    location.reload();
}

// تمكين زر الماسح
function enableScannerButton() {
    const startScannerBtn = document.getElementById('startScannerBtn');
    startScannerBtn.disabled = false;
    startScannerBtn.textContent = 'بدء المسح';
}

// عرض حالة الكاميرا
function showCameraStatus(message, type) {
    const cameraStatus = document.getElementById('cameraStatus');
    cameraStatus.innerHTML = message;
    cameraStatus.className = `camera-status ${type}`;
}

// بدء الماسح الضوئي
async function startScanner() {
    if (!librariesLoaded) {
        showCameraStatus('❌ المكتبات غير محملة بعد. الرجاء الانتظار...', 'error');
        return;
    }
    
    if (isScanning) {
        console.log('الماسح يعمل بالفعل');
        return;
    }
    
    const startScannerBtn = document.getElementById('startScannerBtn');
    startScannerBtn.disabled = true;
    startScannerBtn.textContent = 'جاري التشغيل...';
    
    try {
        // إظهار منطقة الماسح
        const readerDiv = document.getElementById('reader');
        const placeholder = document.getElementById('scannerPlaceholder');
        readerDiv.classList.remove('hidden');
        placeholder.textContent = 'جاري تهيئة الكاميرا...';
        placeholder.style.display = 'block';
        
        // الحصول على الكاميرات المتاحة
        const cameras = await Html5Qrcode.getCameras();
        console.log('الكاميرات المتاحة:', cameras);
        
        if (!cameras || cameras.length === 0) {
            throw new Error('لم يتم العثور على كاميرات في الجهاز');
        }
        
        showCameraStatus(`📷 تم العثور على ${cameras.length} كاميرا`, 'success');
        
        // استخدام الكاميرا الخلفية إذا متاحة
        let cameraId = cameras[0].id;
        const backCamera = cameras.find(cam => 
            cam.label.toLowerCase().includes('back') || 
            cam.label.includes('2') ||
            cam.label.toLowerCase().includes('rear')
        );
        
        if (backCamera) {
            cameraId = backCamera.id;
            console.log('Using back camera:', backCamera.label);
        }
        
        // تهيئة الماسح
        html5QrCode = new Html5Qrcode("reader");
        
        // بدء المسح
        await html5QrCode.start(
            cameraId,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            onScanSuccess,
            onScanFailure
        );
        
        isScanning = true;
        startScannerBtn.textContent = 'إيقاف المسح';
        startScannerBtn.disabled = false;
        startScannerBtn.onclick = stopScanner;
        placeholder.style.display = 'none';
        
        showCameraStatus('✅ الكاميرا تعمل بنجاح - وجه الكاميرا نحو QR code', 'success');
        
    } catch (error) {
        console.error('خطأ في تشغيل الماسح:', error);
        
        let errorMessage = '';
        if (error.message.includes('Permission')) {
            errorMessage = '⛔ الرجاء السماح باستخدام الكاميرا في المتصفح';
        } else if (error.message.includes('cameras') || error.message.includes('not found')) {
            errorMessage = '📵 لم يتم العثور على كاميرات في هذا الجهاز';
        } else if (error.message.includes('requesting device permission')) {
            errorMessage = '🔐 جاري طلب صلاحية الكاميرا...';
        } else {
            errorMessage = '❌ ' + error.message;
        }
        
        showCameraStatus(errorMessage, 'error');
        resetScannerButton();
    }
}

// إيقاف الماسح الضوئي
async function stopScanner() {
    console.log('إيقاف الماسح الضوئي...');
    
    if (!html5QrCode || !isScanning) {
        return;
    }
    
    try {
        await html5QrCode.stop();
        isScanning = false;
        
        const readerDiv = document.getElementById('reader');
        readerDiv.classList.add('hidden');
        
        resetScannerButton();
        
        showCameraStatus('⏹️ تم إيقاف الماسح الضوئي', 'success');
        
        setTimeout(() => {
            document.getElementById('cameraStatus').innerHTML = '';
            document.getElementById('cameraStatus').className = 'camera-status';
        }, 2000);
        
    } catch (error) {
        console.error('خطأ في إيقاف الماسح:', error);
        isScanning = false;
        resetScannerButton();
    }
}

// إعادة تعيين زر الماسح
function resetScannerButton() {
    const startScannerBtn = document.getElementById('startScannerBtn');
    startScannerBtn.disabled = false;
    startScannerBtn.textContent = 'بدء المسح';
    startScannerBtn.onclick = startScanner;
}

// عند نجاح المسح
function onScanSuccess(decodedText, decodedResult) {
    console.log('تم مسح QR code:', decodedText);
    currentQRCode = decodedText;
    
    // إيقاف الماسح تلقائياً عند نجاح المسح
    stopScanner().then(() => {
        // عرض نموذج إدخال الكمية
        const itemForm = document.getElementById('itemForm');
        itemForm.classList.remove('hidden');
        document.getElementById('itemName').value = decodedText;
        document.getElementById('quantityInput').focus();
        
        showCameraStatus(`✅ تم مسح: ${decodedText}`, 'success');
    });
}

// عند فشل المسح
function onScanFailure(error) {
    // يتم تجاهل أخطاء المسح المستمرة
}

// إلغاء إضافة الصنف
function cancelAddItem() {
    document.getElementById('itemForm').classList.add('hidden');
    document.getElementById('quantityInput').value = '';
    
    showCameraStatus('تم إلغاء الإضافة', 'warning');
    
    setTimeout(() => {
        document.getElementById('cameraStatus').innerHTML = '';
        document.getElementById('cameraStatus').className = 'camera-status';
    }, 2000);
}

// إضافة صنف جديد
function addItem() {
    const quantity = document.getElementById('quantityInput').value;
    
    if (!quantity || quantity < 1) {
        alert('يرجى إدخال كمية صحيحة');
        document.getElementById('quantityInput').focus();
        return;
    }
    
    // التحقق من عدم وجود الصنف مسبقاً
    const existingItemIndex = items.findIndex(item => item.name === currentQRCode);
    
    if (existingItemIndex !== -1) {
        // تحديث الكمية إذا الصنف موجود
        items[existingItemIndex].quantity += parseInt(quantity);
        items[existingItemIndex].timestamp = new Date().toLocaleString('ar-EG');
    } else {
        // إضافة صنف جديد
        items.push({
            name: currentQRCode,
            quantity: parseInt(quantity),
            timestamp: new Date().toLocaleString('ar-EG')
        });
    }
    
    saveItemsToStorage();
    updateItemsList();
    updateSaveStatus();
    
    document.getElementById('quantityInput').value = '';
    document.getElementById('itemForm').classList.add('hidden');
    
    alert(`تم ${existingItemIndex !== -1 ? 'تحديث' : 'إضافة'} ${currentQRCode} بنجاح!`);
    checkTargetReached();
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
                <div>
                    <strong>${item.name}</strong>
                    <div>الكمية: ${item.quantity}</div>
                    <small>${item.timestamp}</small>
                </div>
                <div class="item-actions">
                    <button class="delete-btn" onclick="deleteItem(${index})">حذف</button>
                </div>
            </div>
        `;
    });
    
    itemsList.innerHTML = html;
}

// باقي الدوال تبقى كما هي (deleteItem, checkTargetReached, exportToExcel, exportBackup, importBackup, updateSaveStatus, saveItemsToStorage, loadItemsFromStorage)

// حذف صنف
function deleteItem(index) {
    if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
        const itemName = items[index].name;
        items.splice(index, 1);
        saveItemsToStorage();
        updateItemsList();
        updateSaveStatus();
        
        showCameraStatus(`🗑️ تم حذف ${itemName}`, 'warning');
        
        setTimeout(() => {
            document.getElementById('cameraStatus').innerHTML = '';
            document.getElementById('cameraStatus').className = 'camera-status';
        }, 2000);
    }
}

// التحقق من الوصول للهدف
function checkTargetReached() {
    if (items.length >= targetCount) {
        if (confirm(`تهانينا! لقد وصلت إلى ${targetCount} صنف. هل تريد تصدير البيانات لـ Excel الآن؟`)) {
            exportToExcel();
        }
    }
}

// تصدير لـ Excel
function exportToExcel() {
    if (items.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
    }
    
    try {
        const data = items.map(item => [
            item.name,
            item.quantity,
            item.timestamp
        ]);
        
        data.unshift(['اسم الصنف', 'الكمية', 'وقت الإضافة']);
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'جرد المخزون');
        
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `جرد_المخزون_${date}.xlsx`);
        
        showCameraStatus('📊 تم تصدير البيانات بنجاح!', 'success');
        
    } catch (error) {
        console.error('خطأ في التصدير:', error);
        alert('حدث خطأ أثناء التصدير. يرجى المحاولة مرة أخرى.');
    }
}

// تصدير نسخة احتياطية
function exportBackup() {
    if (items.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
    }
    
    const dataStr = JSON.stringify(items, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `نسخة_احتياطية_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showCameraStatus('💾 تم تصدير النسخة الاحتياطية!', 'success');
}

// استيراد نسخة احتياطية
function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedItems = JSON.parse(e.target.result);
            if (Array.isArray(importedItems)) {
                if (confirm(`سيتم استبدال جميع البيانات الحالية بـ ${importedItems.length} صنف. هل أنت متأكد؟`)) {
                    items = importedItems;
                    saveItemsToStorage();
                    updateItemsList();
                    updateSaveStatus();
                    
                    showCameraStatus(`📥 تم استيراد ${items.length} صنف بنجاح`, 'success');
                }
            } else {
                alert('ملف غير صحيح');
            }
        } catch (error) {
            alert('خطأ في قراءة الملف: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// تحديث حالة الحفظ
function updateSaveStatus() {
    const lastSave = localStorage.getItem('lastSave');
    if (lastSave) {
        const date = new Date(lastSave);
        document.getElementById('lastSaveTime').textContent = date.toLocaleString('ar-EG');
    } else {
        document.getElementById('lastSaveTime').textContent = 'لم يتم الحفظ بعد';
    }
}

// حفظ البيانات في التخزين المحلي
function saveItemsToStorage() {
    try {
        localStorage.setItem('inventoryItems', JSON.stringify(items));
        localStorage.setItem('lastSave', new Date().toISOString());
        console.log('تم حفظ البيانات بنجاح');
    } catch (error) {
        console.error('خطأ في الحفظ:', error);
        if (error.name === 'QuotaExceededError') {
            alert('مساحة التخزين ممتلئة. يرجى تصدير نسخة احتياطية وحذف بعض البيانات.');
        }
    }
}

// تحميل البيانات من التخزين المحلي
function loadItemsFromStorage() {
    try {
        const saved = localStorage.getItem('inventoryItems');
        if (saved) {
            items = JSON.parse(saved);
            console.log(`تم تحميل ${items.length} صنف`);
        }
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        items = [];
    }
}

// حفظ تلقائي عند إغلاق الصفحة
window.addEventListener('beforeunload', function() {
    if (isScanning && html5QrCode) {
        stopScanner();
    }
    saveItemsToStorage();
});

// حفظ كل 30 ثانية للاحتياط
setInterval(function() {
    if (items.length > 0) {
        saveItemsToStorage();
        updateSaveStatus();
    }
}, 30000);

// متغيرات التطبيق
let items = [];
let html5QrCode = null;
let currentQRCode = '';
const targetCount = 20;
let isScanning = false;

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    console.log('جاري تهيئة التطبيق...');
    document.getElementById('targetCount').textContent = targetCount;
    loadItemsFromStorage();
    updateItemsList();
    updateSaveStatus();
    
    // اختبار تحميل المكتبات
    testLibraries();
});

// اختبار تحميل المكتبات
function testLibraries() {
    console.log('Html5Qrcode:', typeof Html5Qrcode);
    console.log('XLSX:', typeof XLSX);
    
    if (typeof Html5Qrcode === 'undefined') {
        showCameraStatus('⚠️ لم يتم تحميل مكتبة QR Scanner بشكل صحيح', 'error');
    } else {
        showCameraStatus('✅ المكتبات محملة بنجاح', 'success');
    }
}

// عرض حالة الكاميرا
function showCameraStatus(message, type) {
    const statusDiv = document.getElementById('cameraStatus');
    statusDiv.innerHTML = message;
    statusDiv.className = `camera-status ${type}`;
    
    // إخفاء الرسالة بعد 5 ثواني
    setTimeout(() => {
        statusDiv.innerHTML = '';
        statusDiv.className = 'camera-status';
    }, 5000);
}

// بدء الماسح الضوئي
async function startScanner() {
    console.log('بدء تشغيل الماسح الضوئي...');
    
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
        
        // التأكد من تحميل المكتبة
        if (typeof Html5Qrcode === 'undefined') {
            throw new Error('مكتبة QR Scanner غير محملة');
        }
        
        // الحصول على الكاميرات المتاحة
        const cameras = await Html5Qrcode.getCameras();
        console.log('الكاميرات المتاحة:', cameras);
        
        if (!cameras || cameras.length === 0) {
            throw new Error('لم يتم العثور على كاميرات');
        }
        
        // استخدام الكاميرا الخلفية إذا متاحة
        let cameraId = cameras[0].id;
        const backCamera = cameras.find(cam => cam.label.toLowerCase().includes('back'));
        if (backCamera) {
            cameraId = backCamera.id;
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
        readerDiv.classList.add('active');
        placeholder.style.display = 'none';
        
        showCameraStatus('✅ الكاميرا تعمل بنجاح - وجه الكاميرا نحو QR code', 'success');
        
    } catch (error) {
        console.error('خطأ في تشغيل الماسح:', error);
        
        let errorMessage = 'تعذر تشغيل الكاميرا: ';
        if (error.message.includes('Permission')) {
            errorMessage += 'الرجاء السماح باستخدام الكاميرا';
        } else if (error.message.includes('cameras')) {
            errorMessage += 'لم يتم العثور على كاميرات';
        } else if (error.message.includes('not loaded')) {
            errorMessage += 'مكتبة المسح غير محملة';
        } else {
            errorMessage += error.message;
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
        readerDiv.classList.remove('active');
        
        resetScannerButton();
        
        showCameraStatus('تم إيقاف الماسح الضوئي', 'success');
        
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
    // console.log('فشل المسح:', error);
}

// إلغاء إضافة الصنف
function cancelAddItem() {
    document.getElementById('itemForm').classList.add('hidden');
    document.getElementById('quantityInput').value = '';
    showCameraStatus('تم إلغاء الإضافة', 'success');
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

// حذف صنف
function deleteItem(index) {
    if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
        items.splice(index, 1);
        saveItemsToStorage();
        updateItemsList();
        updateSaveStatus();
        showCameraStatus('تم حذف الصنف', 'success');
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
        
        showCameraStatus('تم تصدير البيانات بنجاح!', 'success');
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
    
    showCameraStatus('تم تصدير النسخة الاحتياطية بنجاح!', 'success');
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
                    showCameraStatus(`تم استيراد ${items.length} صنف بنجاح`, 'success');
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
    if (isScanning) {
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

// المتغيرات الرئيسية
let items = [];
let html5QrCode;
let currentQRCode = '';

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    loadItemsFromStorage();
    updateItemsList();
    updateSaveStatus();
});

// تحديث وقت آخر حفظ
function updateSaveStatus() {
    const lastSave = localStorage.getItem('lastSave');
    if (lastSave) {
        const date = new Date(lastSave);
        document.getElementById('lastSaveTime').textContent = date.toLocaleString('ar-EG');
    }
}

// بدء تشغيل الماسح الضوئي
function startScanner() {
    const readerDiv = document.getElementById('reader');
    readerDiv.classList.remove('hidden');
    
    html5QrCode = new Html5Qrcode("reader");
    
    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length > 0) {
            const cameraId = cameras[0].id;
            
            html5QrCode.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                onScanSuccess,
                onScanFailure
            ).catch(err => {
                console.error(`Unable to start scanning: ${err}`);
                alert('فشل تشغيل الماسح. يرجى التأكد من منح إذن الوصول للكاميرا.');
            });
        }
    }).catch(err => {
        console.error(`Cannot get cameras: ${err}`);
        alert('لا يمكن الوصول للكاميرات. يرجى التحقق من الأذونات.');
    });
}

// عند نجاح المسح
function onScanSuccess(decodedText, decodedResult) {
    currentQRCode = decodedText;
    
    html5QrCode.stop().then(ignore => {
        document.getElementById('reader').classList.add('hidden');
        
        const itemForm = document.getElementById('itemForm');
        itemForm.classList.remove('hidden');
        document.getElementById('itemName').value = decodedText;
        document.getElementById('quantityInput').focus();
    }).catch(err => {
        console.error(`Unable to stop scanning: ${err}`);
    });
}

// عند فشل المسح
function onScanFailure(error) {
    // يمكن تجاهل الأخطاء البسيطة أثناء البحث عن الكود
}

// إضافة عنصر جديد
function addItem() {
    const quantity = document.getElementById('quantityInput').value;
    
    if (!quantity || quantity < 1) {
        alert('يرجى إدخال كمية صحيحة');
        return;
    }
    
    items.push({
        name: currentQRCode,
        quantity: parseInt(quantity),
        timestamp: new Date().toLocaleString('ar-EG')
    });
    
    saveItemsToStorage();
    updateItemsList();
    updateSaveStatus();
    
    document.getElementById('quantityInput').value = '';
    document.getElementById('itemForm').classList.add('hidden');
    
    alert(`تمت إضافة ${currentQRCode} بنجاح!`);
}

// تحديث قائمة العناصر
function updateItemsList() {
    const itemsList = document.getElementById('itemsList');
    const itemsCount = document.getElementById('itemsCount');
    
    itemsCount.textContent = items.length;
    
    if (items.length === 0) {
        itemsList.innerHTML = '<div class="empty-state">لا توجد عناصر مضافة بعد</div>';
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

// حذف عنصر
function deleteItem(index) {
    if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
        items.splice(index, 1);
        saveItemsToStorage();
        updateItemsList();
        updateSaveStatus();
    }
}

// تصدير إلى Excel
function exportToExcel() {
    if (items.length === 0) {
        alert('لا توجد بيانات لتصديرها');
        return;
    }
    
    try {
        const data = items.map(item => [
            item.name,
            item.quantity,
            item.timestamp
        ]);
        
        data.unshift(['بيان الصنف', 'الكمية', 'وقت التسجيل']);
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'جرد العناصر');
        
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `جرد_العناصر_${date}.xlsx`);
        
        alert('تم تصدير البيانات بنجاح!');
    } catch (error) {
        console.error('خطأ في التصدير:', error);
        alert('حدث خطأ أثناء التصدير. يرجى مراجعة وحدة التحكم.');
    }
}

// تصدير نسخة احتياطية
function exportBackup() {
    if (items.length === 0) {
        alert('لا توجد بيانات لعمل نسخة احتياطية');
        return;
    }
    
    const dataStr = JSON.stringify(items, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `نسخة_احتياطية_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    alert('تم حفظ النسخة الاحتياطية بنجاح!');
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
                if (confirm(`سيتم استيراد ${importedItems.length} عنصر. هل تريد المتابعة؟`)) {
                    items = importedItems;
                    saveItemsToStorage();
                    updateItemsList();
                    updateSaveStatus();
                    alert(`تم استيراد ${items.length} عنصر بنجاح`);
                }
            } else {
                alert('ملف النسخة الاحتياطية غير صالح');
            }
        } catch (error) {
            alert('فشل في قراءة الملف: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
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
            alert('مساحة التخزين ممتلئة. يرجى تصدير البيانات وأخذ نسخة احتياطية.');
        }
    }
}

// تحميل البيانات من التخزين المحلي
function loadItemsFromStorage() {
    try {
        const saved = localStorage.getItem('inventoryItems');
        if (saved) {
            items = JSON.parse(saved);
        }
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        items = [];
    }
}

// الحفظ التلقائي عند إغلاق الصفحة
window.addEventListener('beforeunload', function() {
    saveItemsToStorage();
});

// الحفظ الدوري كل 30 ثانية
setInterval(function() {
    if (items.length > 0) {
        saveItemsToStorage();
        updateSaveStatus();
    }
}, 30000);

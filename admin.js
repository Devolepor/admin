// Initialize jsPDF
const { jsPDF } = window.jspdf;

let students = {};
let sha = "";
const owner = "Devolepor";
const repo = "app";
const path = "students.json";
const branch = "main";
const PASSWORD = "0101356859001223277310";
const GITHUB_TOKEN = "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"; // استبدل هذا بالتوكن الفعلي
let githubFileUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${path}`;
let currentStudentId = null;
let deleteStudentId = null;
let isLoading = false;
let originalButtonText = "";

const grades = [
  "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
  "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
  "الصف الأول الإعدادي", "الصف الثاني الإعدادي", "الصف الثالث الإعدادي",
  "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
];

const levels = ["ضعيف", "مقبول", "جيد", "جيد جدا", "ممتاز"];

// أيام الأسبوع وأشهر السنة للاستخدام في الجدول
const weekDays = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const months = ["أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر", "يناير", "فبراير", "مارس", "أبريل"];

// Check for saved theme preference
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
  document.getElementById("themeToggle").innerHTML = '<i class="fas fa-sun"></i>';
}

// Theme toggle functionality
document.getElementById("themeToggle").addEventListener("click", function() {
  document.body.classList.toggle("dark-mode");
  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("theme", "dark");
    this.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    localStorage.setItem("theme", "light");
    this.innerHTML = '<i class="fas fa-moon"></i>';
  }
});

function checkLogin() {
  const pass = document.getElementById("loginPassword").value;
  if (pass === PASSWORD) {
    localStorage.setItem("isLoggedIn", "true");
    document.getElementById("loginScreen").style.display = "none";
    loadStudents();
  } else {
    Swal.fire({
      title: 'خطأ!',
      text: 'كلمة مرور خاطئة!',
      icon: 'error',
      confirmButtonText: 'حسناً'
    });
  }
}

async function loadStudents() {
  try {
    showLoading(true);
    let res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
    if (!res.ok) throw new Error('فشل في تحميل البيانات');
    
    let data = await res.json();
    sha = data.sha;
    let decodedContent = decodeURIComponent(escape(atob(data.content)));
    students = JSON.parse(decodedContent);
    renderTable();
  } catch (error) {
    console.error("Error loading students:", error);
    students = {};
    renderTable();
    Swal.fire({
      title: 'تحذير',
      text: 'لا يوجد بيانات حالية، سيتم إنشاء ملف جديد عند الحفظ',
      icon: 'warning'
    });
  } finally {
    showLoading(false);
  }
}

function renderTable(filterGrade = null) {
  let html = `
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الكود</th>
            <th>الاسم</th>
            <th>الصف</th>
            <th>المستوى</th>
            <th>الحضور</th>
            <th>المصروفات</th>
            <th>تعديل</th>
            <th>حذف</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  let count = 1;
  let studentCount = 0;
  
  for (let id in students) {
    let s = students[id];
    if (filterGrade && s.main.trim() !== filterGrade.trim()) continue;

    studentCount++;
    
    // تحضير بيانات الحضور
    let attendanceHtml = weekDays.map(day => {
      const status = s.attendance?.[day] || '-';
      return `
        <div class="attendance-select">
          ${day}: 
          <select onchange="updateAttendance('${id}','${day}',this.value)" style="padding: 5px; border-radius: 5px; background: var(--white); color: var(--text-color);">
            <option value="حاضر" ${status === "حاضر" ? 'selected' : ''}>حاضر</option>
            <option value="غائب" ${status === "غائب" ? 'selected' : ''}>غائب</option>
            <option value="-" ${status === "-" ? 'selected' : ''}>-</option>
          </select>
        </div>
      `;
    }).join('');
    
    // تحضير بيانات المصروفات
    let feesHtml = months.map(month => {
      const paid = s.fees?.[month] || false;
      return `
        <div class="fee-checkbox">
          ${month}: 
          <input type="checkbox" onchange="updateFee('${id}','${month}',this.checked)" ${paid ? 'checked' : ''} 
                 style="transform: scale(1.3); margin-right: 5px;">
        </div>
      `;
    }).join('');
    
    html += `
      <tr>
        <td>${count++}</td>
        <td>${id}</td>
        <td>${s.name}</td>
        <td>${s.main}</td>
        <td>${s.info || '-'}</td>
        <td>${attendanceHtml}</td>
        <td>${feesHtml}</td>
        <td><button class="btn" onclick="showEditModal('${id}')"><i class="fas fa-edit"></i> تعديل</button></td>
        <td><button class="btn btn-danger" onclick="showDeleteModal('${id}')"><i class="fas fa-trash"></i> حذف</button></td>
      </tr>
    `;
  }
  
  html += `
        </tbody>
      </table>
    </div>
  `;
  
  document.getElementById('studentsTable').innerHTML = studentCount > 0 ? html : `
    <div style="text-align: center; padding: 40px; background: var(--white); border-radius: 12px; box-shadow: var(--shadow);">
      <h3 style="color: var(--text-light);"><i class="fas fa-info-circle"></i> لا يوجد طلاب مسجلين حالياً</h3>
      <button class="btn btn-success" onclick="showAddModal()" style="margin-top: 20px;"><i class="fas fa-user-plus"></i> إضافة طالب جديد</button>
    </div>
  `;
  
  document.getElementById('studentsCount').innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span><i class="fas fa-users"></i> عدد الطلاب المعروضين: ${studentCount}</span>
      <span><i class="fas fa-calendar-alt"></i> ${new Date().toLocaleDateString('ar-EG')}</span>
    </div>
  `;
}

function updateAttendance(id, day, value) {
  if (!students[id].attendance) {
    students[id].attendance = {};
  }
  students[id].attendance[day] = value;
}

function updateFee(id, month, value) {
  if (!students[id].fees) {
    students[id].fees = {};
  }
  students[id].fees[month] = value;
}

function searchStudent() {
  const id = document.getElementById('searchId').value.trim();
  if (!id) {
    Swal.fire({
      title: 'تنبيه',
      text: 'الرجاء إدخال كود الطالب للبحث',
      icon: 'warning'
    });
    return;
  }

  if (students[id]) {
    const student = students[id];
    let attendanceList = weekDays.map(day => 
      `<li>${day}: ${student.attendance?.[day] || '-'}</li>`
    ).join('');
    
    let feesList = months.map(month => 
      `<li>${month}: ${student.fees?.[month] ? '✅ مسددة' : '❌ غير مسددة'}</li>`
    ).join('');
    
    Swal.fire({
      title: '📄 بيانات الطالب',
      html: `
        <div style="text-align: right;">
          <p><b><i class="fas fa-id-card"></i> الكود:</b> ${id}</p>
          <p><b><i class="fas fa-user"></i> الاسم:</b> ${student.name}</p>
          <p><b><i class="fas fa-graduation-cap"></i> الصف:</b> ${student.main}</p>
          <p><b><i class="fas fa-star"></i> المستوى:</b> ${student.info || '-'}</p>
          <hr>
          <h4><i class="fas fa-calendar-check"></i> الحضور:</h4>
          <ul>${attendanceList}</ul>
          <h4><i class="fas fa-money-bill-wave"></i> المصروفات:</h4>
          <ul>${feesList}</ul>
        </div>
      `,
      confirmButtonText: 'حسناً',
      width: '600px'
    });
  } else {
    Swal.fire({
      title: '⚠️ تنبيه',
      text: 'لم يتم العثور على الطالب',
      confirmButtonText: 'حسناً'
    });
  }
}

function openFile() {
  window.open(githubFileUrl, '_blank');
}

function showGradeModal() {
  const gradeSelect = document.getElementById('gradeSelect');
  gradeSelect.innerHTML = '<option value="">عرض جميع الطلاب</option>';
  grades.forEach(grade => {
    gradeSelect.innerHTML += `<option value="${grade}">${grade}</option>`;
  });
  document.getElementById('gradeModal').style.display = 'block';
}

function filterByGrade() {
  const gradeSelect = document.getElementById('gradeSelect');
  const selectedGrade = gradeSelect.value;
  renderTable(selectedGrade);
  closeModal();
}

function showAddModal() {
  currentStudentId = null;
  document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-plus"></i> إضافة طالب جديد';
  document.getElementById('studentId').value = '';
  document.getElementById('studentName').value = '';
  document.getElementById('studentLevel').value = '';
  
  const gradeSelect = document.getElementById('studentGrade');
  gradeSelect.innerHTML = '<option value="" disabled selected>اختر الصف</option>';
  grades.forEach(grade => {
    gradeSelect.innerHTML += `<option value="${grade}">${grade}</option>`;
  });
  
  document.getElementById('saveStudentBtn').onclick = saveStudent;
  document.getElementById('studentModal').style.display = 'block';
  
  // Focus on first input
  setTimeout(() => {
    document.getElementById('studentId').focus();
  }, 100);
}

function showEditModal(id) {
  currentStudentId = id;
  const student = students[id];
  
  document.getElementById('modalTitle').innerHTML = `<i class="fas fa-user-edit"></i> تعديل بيانات الطالب ${id}`;
  document.getElementById('studentId').value = id;
  document.getElementById('studentName').value = student.name;
  
  const gradeSelect = document.getElementById('studentGrade');
  gradeSelect.innerHTML = '';
  grades.forEach(grade => {
    gradeSelect.innerHTML += `<option value="${grade}" ${grade === student.main ? 'selected' : ''}>${grade}</option>`;
  });
  
  const levelSelect = document.getElementById('studentLevel');
  levelSelect.innerHTML = '<option value="" disabled>اختر المستوى</option>';
  levels.forEach(level => {
    levelSelect.innerHTML += `<option value="${level}" ${level === student.info ? 'selected' : ''}>${level}</option>`;
  });
  
  document.getElementById('saveStudentBtn').onclick = saveStudent;
  document.getElementById('studentModal').style.display = 'block';
}

function showDeleteModal(id) {
  deleteStudentId = id;
  const student = students[id];
  document.getElementById('deleteMessage').innerHTML = `
    <p>هل أنت متأكد من حذف الطالب التالي؟</p>
    <div style="background: var(--gray-light); padding: 10px; border-radius: 8px; margin-top: 10px;">
      <p><strong><i class="fas fa-id-card"></i> الكود:</strong> ${id}</p>
      <p><strong><i class="fas fa-user"></i> الاسم:</strong> ${student.name}</p>
      <p><strong><i class="fas fa-graduation-cap"></i> الصف:</strong> ${student.main}</p>
    </div>
    <p style="color: var(--danger-color); margin-top: 10px;"><i class="fas fa-exclamation-triangle"></i> هذا الإجراء لا يمكن التراجع عنه!</p>
  `;
  document.getElementById('deleteModal').style.display = 'block';
}

function closeModal() {
  document.getElementById('studentModal').style.display = 'none';
  document.getElementById('gradeModal').style.display = 'none';
  document.getElementById('deleteModal').style.display = 'none';
}

function saveStudent() {
  const id = document.getElementById('studentId').value.trim();
  const name = document.getElementById('studentName').value.trim();
  const grade = document.getElementById('studentGrade').value;
  const level = document.getElementById('studentLevel').value;
  
  if (!id) {
    showError('يجب إدخال كود الطالب');
    document.getElementById('studentId').focus();
    return;
  }
  
  if (!name) {
    showError('يجب إدخال اسم الطالب');
    document.getElementById('studentName').focus();
    return;
  }
  
  if (!grade) {
    showError('يجب اختيار الصف');
    document.getElementById('studentGrade').focus();
    return;
  }
  
  if (currentStudentId === null && students[id]) {
    showError('كود الطالب موجود مسبقاً');
    document.getElementById('studentId').focus();
    return;
  }
  
  if (currentStudentId === null) {
    // Add new student
    students[id] = {
      name,
      main: grade,
      info: level,
      attendance: Object.fromEntries(weekDays.map(day => [day, "-"])),
      fees: Object.fromEntries(months.map(month => [month, false]))
    };
  } else {
    // Update existing student
    if (currentStudentId !== id) {
      // If ID changed, we need to create new entry and delete old one
      students[id] = {
        name,
        main: grade,
        info: level,
        attendance: {...students[currentStudentId].attendance},
        fees: {...students[currentStudentId].fees}
      };
      delete students[currentStudentId];
    } else {
      // Just update the existing student
      students[id].name = name;
      students[id].main = grade;
      students[id].info = level;
    }
  }
  
  renderTable();
  closeModal();
  showSuccess('تم حفظ بيانات الطالب بنجاح');
}

function confirmDelete() {
  if (deleteStudentId) {
    delete students[deleteStudentId];
    renderTable();
    closeModal();
    showSuccess('تم حذف الطالب بنجاح');
    deleteStudentId = null;
  }
}

async function saveToGitHub() {
  const content = JSON.stringify(students, null, 2);
  const utf8Content = unescape(encodeURIComponent(content));
  const encoded = btoa(utf8Content);

  try {
    showLoading(true);
    const saveBtn = document.querySelector('button[onclick="saveToGitHub()"]');
    originalButtonText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner"></span> جاري الحفظ...';
    saveBtn.disabled = true;
    
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "تحديث بيانات الطلاب من لوحة التحكم",
        content: encoded,
        sha: sha,
        branch: branch
      })
    });

    if (res.ok) {
      const data = await res.json();
      sha = data.content.sha;
      showSuccess('تم حفظ البيانات بنجاح على GitHub');
      loadStudents();
    } else {
      const error = await res.json();
      showError(`فشل في الحفظ! ${error.message}`);
    }
  } catch (error) {
    showError(`خطأ في الاتصال: ${error.message}`);
  } finally {
    showLoading(false);
    const saveBtn = document.querySelector('button[onclick="saveToGitHub()"]');
    if (saveBtn) {
      saveBtn.innerHTML = originalButtonText;
      saveBtn.disabled = false;
    }
  }
}

function showLoading(show) {
  isLoading = show;
  const loader = document.createElement('div');
  loader.id = 'loadingOverlay';
  loader.style.position = 'fixed';
  loader.style.top = '0';
  loader.style.left = '0';
  loader.style.width = '100%';
  loader.style.height = '100%';
  loader.style.backgroundColor = 'rgba(0,0,0,0.5)';
  loader.style.display = 'flex';
  loader.style.justifyContent = 'center';
  loader.style.alignItems = 'center';
  loader.style.zIndex = '9998';
  loader.innerHTML = `
    <div style="background: var(--white); padding: 30px; border-radius: 12px; text-align: center; box-shadow: var(--shadow);">
      <div class="spinner" style="width: 40px; height: 40px; margin: 0 auto 15px; border-top-color: var(--primary-color);"></div>
      <p style="font-weight: bold; color: var(--text-color);">جاري التحميل...</p>
    </div>
  `;
  
  if (show) {
    document.body.appendChild(loader);
  } else {
    const existingLoader = document.getElementById('loadingOverlay');
    if (existingLoader) {
      existingLoader.remove();
    }
  }
}

function showError(message) {
  Swal.fire({
    title: '❌ خطأ',
    text: message,
    icon: 'error',
    confirmButtonText: 'حسناً'
  });
}

function showSuccess(message) {
  Swal.fire({
    title: '✅ تم بنجاح',
    text: message,
    icon: 'success',
    confirmButtonText: 'حسناً'
  });
}

// Export data functions
function exportData(format) {
  if (Object.keys(students).length === 0) {
    showError('لا يوجد بيانات لتصديرها');
    return;
  }

  switch(format) {
    case 'pdf':
      exportToPDF();
      break;
    case 'excel':
      exportToExcel();
      break;
    case 'word':
      exportToWord();
      break;
    case 'json':
      exportToJSON();
      break;
    default:
      showError('صيغة التصدير غير معروفة');
  }
}

function exportToPDF() {
  const doc = new jsPDF();
  
  // Add title
  doc.setFont('Tajawal', 'normal');
  doc.setTextColor(33, 150, 243);
  doc.setFontSize(22);
  doc.text('تقرير بيانات الطلاب', 105, 15, null, null, 'center');
  
  // Add date
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`, 105, 25, null, null, 'center');
  
  let y = 35;
  
  // Add each student's data
  Object.keys(students).forEach((id, index) => {
    const student = students[id];
    
    // Start new page if needed
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    // Student header
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`الطالب ${index + 1}: ${student.name} (${id})`, 14, y);
    y += 10;
    
    // Basic info
    doc.setFontSize(12);
    doc.text(`الصف: ${student.main}`, 14, y);
    doc.text(`المستوى: ${student.info || '-'}`, 100, y);
    y += 8;
    
    // Attendance
    doc.text('الحضور:', 14, y);
    y += 8;
    
    let attendanceText = weekDays.map(day => {
      return `${day}: ${student.attendance?.[day] || '-'}`;
    }).join('، ');
    
    doc.text(attendanceText, 14, y, { maxWidth: 180 });
    y += 10;
    
    // Fees
    doc.text('المصروفات:', 14, y);
    y += 8;
    
    let feesText = months.map(month => {
      return `${month}: ${student.fees?.[month] ? 'مسددة' : 'غير مسددة'}`;
    }).join('، ');
    
    doc.text(feesText, 14, y, { maxWidth: 180 });
    y += 15;
    
    // Add separator
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 196, y);
    y += 5;
  });
  
  // Save the PDF
  doc.save('بيانات_الطلاب.pdf');
}

function exportToExcel() {
  // Prepare data
  const data = [];
  
  // Add headers
  data.push([
    'كود الطالب', 'الاسم', 'الصف', 'المستوى', 
    ...weekDays.map(d => `حضور ${d}`),
    ...months.map(m => `مصروفات ${m}`)
  ]);
  
  // Add students data
  Object.keys(students).forEach(id => {
    const student = students[id];
    const row = [
      id,
      student.name,
      student.main,
      student.info || '-',
      ...weekDays.map(day => student.attendance?.[day] || '-'),
      ...months.map(month => student.fees?.[month] ? 'مسددة' : 'غير مسددة')
    ];
    data.push(row);
  });
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "بيانات الطلاب");
  
  // Export to Excel
  XLSX.writeFile(wb, "بيانات_الطلاب.xlsx");
}

function exportToWord() {
  // Create HTML content
  let html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>بيانات الطلاب</title>
      <style>
        body { font-family: 'Tajawal', sans-serif; }
        h1 { color: #1976d2; text-align: center; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #1976d2; color: white; }
      </style>
    </head>
    <body>
      <h1>تقرير بيانات الطلاب</h1>
      <p style="text-align: center;">تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}</p>
      <table>
        <tr>
          <th>#</th>
          <th>الكود</th>
          <th>الاسم</th>
          <th>الصف</th>
          <th>المستوى</th>
        </tr>
  `;
  
  // Add students data
  let count = 1;
  Object.keys(students).forEach(id => {
    const student = students[id];
    html += `
      <tr>
        <td>${count++}</td>
        <td>${id}</td>
        <td>${student.name}</td>
        <td>${student.main}</td>
        <td>${student.info || '-'}</td>
      </tr>
    `;
  });
  
  html += `
      </table>
    </body>
    </html>
  `;
  
  // Create Blob and download
  const blob = new Blob([html], { type: 'application/msword' });
  saveAs(blob, 'بيانات_الطلاب.doc');
}

function exportToJSON() {
  const dataStr = JSON.stringify(students, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  saveAs(blob, 'بيانات_الطلاب.json');
}

// Initialize when page loads
window.onload = function() {
  // Check if already logged in
  if (localStorage.getItem('isLoggedIn') === 'true') {
    document.getElementById('loginScreen').style.display = 'none';
    loadStudents();
  }
  
  // Focus on password field if not logged in
  if (document.getElementById('loginScreen').style.display !== 'none') {
    document.getElementById('loginPassword').focus();
  }
};

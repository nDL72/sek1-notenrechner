
const requiredSubjects = [
  'Deutsch','Mathematik','Englisch',
  'Politik','Wirtschaft','Biologie','Geschichte','Informatik'
];
const tableBody = document.querySelector('#gradeTable tbody');

function initTable() {
  tableBody.innerHTML = '';
  requiredSubjects.forEach(sub => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${sub}</td>
      <td><input type="number" min="1" max="6" class="note" value="6" /></td>
      <td>
        <select class="kurs">
          <option value="G">G</option>
          <option value="E">E</option>
        </select>
      </td>`;
    tableBody.appendChild(row);
  });
}

document.getElementById('save').onclick = () => {
  const grades = serializeGrades();
  localStorage.setItem('sek1Grades', JSON.stringify(grades));
  alert('Daten gespeichert');
};

function loadData() {
  const data = localStorage.getItem('sek1Grades');
  if (data) {
    const grades = JSON.parse(data);
    [...tableBody.querySelectorAll('tr')].forEach((row, i) => {
      row.querySelector('.note').value = grades[i].note;
      row.querySelector('.kurs').value = grades[i].kurs;
    });
  }
}

document.getElementById('compute').onclick = computeGrades;
document.getElementById('pdf').onclick = exportPDF;
document.getElementById('print').onclick = () => window.print();

function serializeGrades() {
  return [...tableBody.querySelectorAll('tr')].map(r => ({
    fach: r.cells[0].textContent,
    note: parseInt(r.querySelector('.note').value) || 6,
    kurs: r.querySelector('.kurs').value
  }));
}

function computeGrades() {
  const grades = serializeGrades();
  const bonusAdjust = grades.map(g => {
    let n = g.note;
    if (g.kurs === 'E') {
      if (n === 4) n = 3;
      else if (n === 2) n = 1;
    }
    return n;
  });
  const avg = (grades.reduce((a,c)=>a+c.note,0)/grades.length).toFixed(2);
  const avgBonus = (bonusAdjust.reduce((a,c)=>a+c,0)/grades.length).toFixed(2);
  const count5 = grades.filter(g=>g.note===5).length;
  const count6 = grades.filter(g=>g.note===6).length;
  const eCourses = grades.filter(g=>g.kurs==='E');
  const eCount = eCourses.length;
  const eGood = eCourses.filter(g=>g.note===2).length;
  const eOK = eCourses.filter(g=>g.note===3).length;

  const results = [];
  const hsOk = (count6===0 && count5<=1) || (count5===2 && count6===0 && (grades.length>=2));
  results.push({name:'HS',ok:hsOk});
  const rsOk = hsOk && avgBonus<=3.00 && eCount>=1;
  results.push({name:'RS',ok:rsOk});
  const eOk = rsOk && eCount>=2 && eGood>=1 && eOK>=1 && avgBonus<=2.00;
  results.push({name:'E‑SV',ok:eOk});

  renderResults(results, avg, avgBonus);
  drawChart(grades);
}

function renderResults(results, avg, avgB) {
  const res = document.getElementById('results');
  res.innerHTML = `
    <p>Ø Normal: <b>${avg}</b> – mit E‑Bonus: <b>${avgB}</b></p>
    ${results.map(r=>`<div class="card ${r.ok?'ok':'fail'}">${r.name}: ${r.ok?'✅ erreicht':'❌ nicht erreicht'}</div>`).join('')}
  `;
}

function drawChart(grades) {
  const ctx = document.getElementById('chart').getContext('2d');
  const notes = grades.map(g => g.note);
  if (window.chart) window.chart.destroy();
  window.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: grades.map(g=>g.fach),
      datasets:[{label:'Note',data:notes,backgroundColor:notes.map(n=>n<=3?'#28a745':'#dc3545')}]
    },
    options:{indexAxis:'y'}
  });
}

function exportPDF() {
  import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js').then(({jsPDF})=>{
    const grades = serializeGrades();
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('SEK I Notenrechner Übersicht',10,10);
    let y = 20;
    grades.forEach(g=>{ doc.text(`${g.fach}: ${g.note} (${g.kurs}-Kurs)`,10,y); y +=7; });
    const p = document.getElementById('results').innerText.split('\n');
    y += 5;
    p.forEach(line=>{doc.text(line,10,y); y +=7;});
    doc.save('notenrechner_seki.pdf');
  });
}

initTable();
loadData();

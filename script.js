
const requiredSubjects = [
  'Deutsch','Englisch','Mathematik','Chemie',
  'Physik','Biologie','Geschichte','Erdkunde',
  'Politik','Wirtschaft','Religion','Sport',
  'Musik','Kunst','Informatik','WPK 1','WPK 2 (optional)'
];

const eCourseSubjects = ['Deutsch','Englisch','Mathematik','Chemie'];
const tableBody = document.querySelector('#gradeTable tbody');

function initTable() {
  tableBody.innerHTML = '';
  requiredSubjects.forEach(sub => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${sub}</td>
      <td><input type="number" min="1" max="6" class="note" value="6" /></td>
      <td>
        ${eCourseSubjects.includes(sub) ? `
        <select class="kurs">
          <option value="G">G</option>
          <option value="E">E</option>
        </select>` : '<span>-</span>'}
      </td>`;
    tableBody.appendChild(row);
  });
}

function serializeGrades() {
  return [...tableBody.querySelectorAll('tr')].map(row => {
    const fach = row.cells[0].textContent;
    const note = parseInt(row.querySelector('.note').value) || 6;
    const kurs = eCourseSubjects.includes(fach)
      ? row.querySelector('.kurs').value
      : 'G';
    return { fach, note, kurs };
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
      const kursEl = row.querySelector('.kurs');
      if (kursEl) kursEl.value = grades[i].kurs;
    });
  }
}

document.getElementById('compute').onclick = computeGrades;
document.getElementById('pdf').onclick = exportPDF;
document.getElementById('print').onclick = () => window.print();

function computeGrades() {
  const grades = serializeGrades();
  const bonusAdjusted = grades.map(g => {
    let n = g.note;
    if (g.kurs === 'E') {
      if (n === 4) n = 3;
      else if (n === 2) n = 1;
    }
    return n;
  });

  const avg = (grades.reduce((a, c) => a + c.note, 0) / grades.length).toFixed(2);
  const avgBonus = (bonusAdjusted.reduce((a, c) => a + c, 0) / grades.length).toFixed(2);
  const count5 = grades.filter(g => g.note === 5).length;
  const count6 = grades.filter(g => g.note === 6).length;
  const eCourses = grades.filter(g => g.kurs === 'E');
  const eCount = eCourses.length;
  const eGood = eCourses.filter(g => g.note <= 2).length;
  const eOK = eCourses.filter(g => g.note <= 3).length;

  const results = [];
  const hsOk = (count6 === 0 && count5 <= 2);
  const rsOk = hsOk && avgBonus <= 3.00 && eCount >= 1;
  const ewsOk = rsOk && eCount >= 2 && eGood >= 1 && eOK >= 2 && avgBonus <= 2.00;

  results.push({
    name: 'Hauptschulabschluss',
    ok: hsOk,
    reasons: [
      `Ø-Note: ${avgBonus} (${hsOk ? '✅' : '❌'})`,
      `max. 2x Note 5: ${count5}, Note 6: ${count6} (${hsOk ? '✅' : '❌'})`
    ]
  });
  results.push({
    name: 'Realschulabschluss',
    ok: rsOk,
    reasons: [
      `HS erreicht: ${hsOk ? '✅' : '❌'}`,
      `Ø-Note mit Bonus ≤ 3,0: ${avgBonus} (${avgBonus <= 3.0 ? '✅' : '❌'})`,
      `mind. 1 E-Kurs belegt: ${eCount} (${eCount >= 1 ? '✅' : '❌'})`
    ]
  });
  results.push({
    name: 'Erweiterter Sek. I',
    ok: ewsOk,
    reasons: [
      `RS erreicht: ${rsOk ? '✅' : '❌'}`,
      `mind. 2 E-Kurse: ${eCount} (${eCount >= 2 ? '✅' : '❌'})`,
      `davon mind. 1 mit Note ≤ 2: ${eGood} (${eGood >= 1 ? '✅' : '❌'})`,
      `und 2 mit Note ≤ 3: ${eOK} (${eOK >= 2 ? '✅' : '❌'})`,
      `Ø-Note mit Bonus ≤ 2,0: ${avgBonus} (${avgBonus <= 2.0 ? '✅' : '❌'})`
    ]
  });

  renderResults(results, avg, avgBonus, count5, count6, eCount);
  window.lastResults = results; // für PDF exportieren
}

function renderResults(results, avg, avgB, count5, count6, eCount) {
  const res = document.getElementById('results');
  res.innerHTML = `
    <p>Ø Normal: <b>${avg}</b> – mit E‑Bonus: <b>${avgB}</b></p>
    <p>⛔ 5er: ${count5}, 6er: ${count6}, E-Kurse: ${eCount}</p>
    ${results.map(r => `
      <div class="card ${r.ok ? 'ok' : 'fail'}">
        <strong>${r.name}</strong>: ${r.ok ? '✅ erreicht' : '❌ nicht erreicht'}<br />
        ${r.reasons.map(reason => `<div>${reason}</div>`).join('')}
      </div>`).join('')}
  `;
}

function exportPDF() {
  import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js').then(({ jsPDF }) => {
    const grades = serializeGrades();
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('SEK I Notenrechner Übersicht', 10, 10);
    let y = 20;
    grades.forEach(g => {
      doc.text(`${g.fach}: ${g.note} (${g.kurs}-Kurs)`, 10, y);
      y += 7;
    });
    y += 5;
    doc.setFontSize(12);
    doc.text('Ergebnisse:', 10, y);
    y += 6;
    (window.lastResults || []).forEach(result => {
      doc.text(`${result.name}: ${result.ok ? '✅ erreicht' : '❌ nicht erreicht'}`, 10, y);
      y += 6;
      result.reasons.forEach(r => {
        doc.text(`  • ${r}`, 12, y);
        y += 5;
      });
      y += 2;
    });
    doc.save('notenrechner_seki.pdf');
  });
}

initTable();
loadData();

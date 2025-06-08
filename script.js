function mudarAntibiotico() {
  const ab = document.getElementById('antibiotico').value;
  const inputsNiveis = document.getElementById('inputsNiveis');

  if (ab === 'tobra') {
    inputsNiveis.style.display = 'none';
  } else {
    inputsNiveis.style.display = 'block';
  }
}

function idadeDecimal() {
  const valor = parseFloat(document.getElementById('idadeValor').value) || 0;
  const unidade = document.getElementById('idadeUnidade').value;

  if (unidade === 'anos') {
    return valor;
  } else if (unidade === 'meses') {
    return valor / 12;
  } else if (unidade === 'dias') {
    return valor / 365;
  }
}

function carregarDoente() {
  const id = document.getElementById('idDoente').value;
  const dados = JSON.parse(localStorage.getItem(`doente_${id}`));

  if (dados) {
    document.getElementById('antibiotico').value = dados.antibiotico;
    mudarAntibiotico();
    document.getElementById('peso').value = dados.peso;
    document.getElementById('altura').value = dados.altura;
    document.getElementById('idadeValor').value = dados.idadeValor;
    document.getElementById('idadeUnidade').value = dados.idadeUnidade;
    document.getElementById('sexo').value = dados.sexo;
    document.getElementById('creat').value = dados.creat;
    document.getElementById('nivel1').value = dados.nivel1;
    document.getElementById('tempo1').value = dados.tempo1;
    document.getElementById('tipoNivel').value = dados.tipoNivel;
    document.getElementById('tipoInfeccao').value = dados.tipoInfeccao;
    document.getElementById('doseAtual').value = dados.doseAtual;
    document.getElementById('intervaloAtual').value = dados.intervaloAtual;
    document.getElementById('resultado').innerHTML = dados.resultado || '';
  }
}

function calcular() {
  const id = document.getElementById('idDoente').value;
  const peso = parseFloat(document.getElementById('peso').value);
  const altura = parseFloat(document.getElementById('altura').value);
  const idadeDec = idadeDecimal();
  const idadeValor = parseFloat(document.getElementById('idadeValor').value) || 0;
  const idadeUnidade = document.getElementById('idadeUnidade').value;
  const sexo = document.getElementById('sexo').value;
  const creat = parseFloat(document.getElementById('creat').value);
  const ab = document.getElementById('antibiotico').value;
  const tipoNivel = document.getElementById('tipoNivel').value;
  const tipoInfeccao = document.getElementById('tipoInfeccao').value;
  const C1 = parseFloat(document.getElementById('nivel1').value);
  const t1 = parseFloat(document.getElementById('tempo1').value);
  const doseAtual = parseFloat(document.getElementById('doseAtual').value) || 0;
  const intervaloAtual = document.getElementById('intervaloAtual').value;

  let clCr;
  if (idadeDec < 18) {
    const K = (idadeDec < 1) ? 0.45 : (idadeDec < 12) ? 0.55 : (sexo === 'M' ? 0.7 : 0.55);
    clCr = (K * altura) / creat;
  } else {
    clCr = ((140 - idadeDec) * peso) / (72 * creat);
    if (sexo === 'F') clCr *= 0.85;
  }

  let dosePorToma = 0;
  if (ab === 'vanco') {
    dosePorToma = peso * 15;
  } else if (ab === 'genta' || ab === 'amica' || ab === 'tobra') {
    dosePorToma = peso * 7;
  }

  let resultadoHTML = `
    <b>Dose atual:</b> ${doseAtual} mg<br>
    <b>Intervalo atual:</b> ${intervaloAtual}<br><br>
    <b>ClCr:</b> ${clCr.toFixed(1)} mL/min<br>
  `;

  if (ab !== 'tobra') {
    if (C1 > 0 && !isNaN(t1)) {
      let ke_aprox;
      if (tipoNivel === 'Pico' || tipoNivel === 'Vale') {
        ke_aprox = (clCr >= 60) ? 0.12 : (clCr >= 30) ? 0.08 : 0.05;
      } else {
        ke_aprox = (clCr >= 60) ? 0.1 : (clCr >= 30) ? 0.07 : 0.05;
      }

      const t12_aprox = Math.log(2) / ke_aprox;
      const vd_aprox = dosePorToma / C1;

      resultadoHTML += `
        <b>Ke (estimado):</b> ${ke_aprox.toFixed(3)} h⁻¹<br>
        <b>T1/2 (estimado):</b> ${t12_aprox.toFixed(2)} h<br>
        <b>Vd (estimado):</b> ${vd_aprox.toFixed(2)} L<br>
      `;

      let intervaloSug = '';
      let adminPorDia = 0;

      if (ab === 'vanco') {
        if (t12_aprox < 4) { intervaloSug = 'q6h'; adminPorDia = 4; }
        else if (t12_aprox < 6) { intervaloSug = 'q8h'; adminPorDia = 3; }
        else if (t12_aprox < 12) { intervaloSug = 'q12h'; adminPorDia = 2; }
        else { intervaloSug = 'q24h'; adminPorDia = 1; }
      } else if (ab === 'genta' || ab === 'amica') {
        if (t12_aprox < 4) { intervaloSug = 'q24h'; adminPorDia = 1; }
        else if (t12_aprox < 6) { intervaloSug = 'q36h'; adminPorDia = 0.67; }
        else { intervaloSug = 'q48h'; adminPorDia = 0.5; }
      }

      const doseTotalDia = dosePorToma * adminPorDia;

      resultadoHTML += `
        <b>Intervalo sugerido:</b> ${intervaloSug}<br>
        <b>Dose total diária sugerida:</b> ${doseTotalDia.toFixed(0)} mg/dia<br>
        <b>Dose por toma:</b> ${dosePorToma.toFixed(0)} mg<br>
      `;

      const alvo = alvoTerap(ab, tipoInfeccao);
      resultadoHTML += `<b>Alvo terapêutico recomendado:</b> ${alvo}<br>`;

      plotarCurva(C1, ke_aprox, t1, intervaloSug);

    } else {
      const ctx = document.getElementById('grafico').getContext('2d');
      if (window.myChart) window.myChart.destroy();
    }
  } else {
    const ctx = document.getElementById('grafico').getContext('2d');
    if (window.myChart) window.myChart.destroy();
  }

  document.getElementById('resultado').innerHTML = resultadoHTML;

  const dadosDoente = {
    antibiotico: ab,
    peso,
    altura,
    idadeValor,
    idadeUnidade,
    sexo,
    creat,
    nivel1: C1,
    tempo1: t1,
    tipoNivel,
    tipoInfeccao,
    doseAtual,
    intervaloAtual,
    resultado: resultadoHTML
  };

  localStorage.setItem(`doente_${id}`, JSON.stringify(dadosDoente));
}

function alvoTerap(ab, tipoInfeccao) {
  const tabelaAlvos = {
    vanco: {
      "Meningite / SNC": "20-30 mg/L",
      "Pneumonia": "15-20 mg/L",
      "Endocardite": "15-20 mg/L",
      "Sepsis": "15-20 mg/L",
      "Osteomielite": "15-20 mg/L",
      "ITU": "10-15 mg/L (ou AUC/MIC > 400)",
      "Outra": "10-15 mg/L"
    },
    genta: {
      "Meningite / SNC": "Pico 8-10 mg/L / Vale < 1 mg/L",
      "Pneumonia": "Pico 8-10 mg/L / Vale < 1 mg/L",
      "Endocardite": "Pico 3-5 mg/L / Vale < 1 mg/L",
      "Sepsis": "Pico 8-10 mg/L / Vale < 1 mg/L",
      "Osteomielite": "Pico 8-10 mg/L / Vale < 1 mg/L",
      "ITU": "Pico 4-6 mg/L / Vale < 1 mg/L",
      "Outra": "Pico 5-7 mg/L / Vale < 1 mg/L"
    },
    amica: {
      "Meningite / SNC": "Pico 8-10 mg/L / Vale < 1 mg/L",
      "Pneumonia": "Pico 8-10 mg/L / Vale < 1 mg/L",
      "Endocardite": "Pico 3-5 mg/L / Vale < 1 mg/L",
      "Sepsis": "Pico 8-10 mg/L / Vale < 1 mg/L",
      "Osteomielite": "Pico 8-10 mg/L / Vale < 1 mg/L",
      "ITU": "Pico 4-6 mg/L / Vale < 1 mg/L",
      "Outra": "Pico 5-7 mg/L / Vale < 1 mg/L"
    },
    tobra: {
      "Meningite / SNC": "Pico 7-10 mg/L / Vale < 1 mg/L",
      "Pneumonia": "Pico 7-10 mg/L / Vale < 1 mg/L",
      "Endocardite": "Pico 7-10 mg/L / Vale < 1 mg/L",
      "Sepsis": "Pico 7-10 mg/L / Vale < 1 mg/L",
      "Osteomielite": "Pico 7-10 mg/L / Vale < 1 mg/L",
      "ITU": "Pico 7-10 mg/L / Vale < 1 mg/L",
      "Outra": "Pico 7-10 mg/L / Vale < 1 mg/L"
    }
  };

  return tabelaAlvos[ab][tipoInfeccao];
}

function plotarCurva(C1, ke, t1, intervaloSug) {
  const times = [];
  const concentrations = [];
  const maxTime = intervaloSug === 'q6h' ? 6 : intervaloSug === 'q8h' ? 8 :
                  intervaloSug === 'q12h' ? 12 : intervaloSug === 'q24h' ? 24 :
                  intervaloSug === 'q36h' ? 36 : 48;

  for (let t = 0; t <= maxTime; t += 0.5) {
    times.push(t);
    const Ct = C1 * Math.exp(-ke * (t - t1));
    concentrations.push(Ct);
  }

  const ctx = document.getElementById('grafico').getContext('2d');
  if (window.myChart) window.myChart.destroy();

  window.myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: times,
      datasets: [{
        label: 'Concentração (mg/L)',
        data: concentrations,
        borderColor: '#0066cc',
        fill: false
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'mg/L'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Tempo (h)'
          }
        }
      }
    }
  });
}
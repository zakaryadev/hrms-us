import { docFileName } from './filename';

const emp = {
  tabNumber: '12', lastName: 'Муратбаев', firstName: 'Закарья', middleName: 'Бахтияр улы',
  department: { name: '“Ijro.gov.uz” тизимини жорий этиш сектори' }, position: { title: 'мижозлар билан ишлаш бўйича менежер' },
};

describe('docFileName', () => {
  it('Т-2: аниқ шаблон (берилган намуна билан бир хил)', () => {
    expect(docFileName('obyektivka', emp)).toBe('12_Muratbayev_Zakarya_Baxtiyar_uli_“Ijro_gov_uz”_menejer.docx');
  });
  it('бошқа ҳужжатлар: тури ва рақами қўшилади', () => {
    expect(docFileName('buyruq-tatil', emp, 'Т-3')).toBe('12_Muratbayev_Zakarya_Baxtiyar_uli_“Ijro_gov_uz”_menejer_buyruq-tatil-T-3.docx');
    expect(docFileName('ariza', emp)).toMatch(/_menejer_ariza\.docx$/);
  });
  it('бўлимда қўштирноқ бўлмаса — шу қисм тушиб қолади; лавозим/бўлим бўлмаса ҳам хато йўқ', () => {
    expect(docFileName('obyektivka', { ...emp, department: { name: 'Кадрлар бўлими' } })).toBe('12_Muratbayev_Zakarya_Baxtiyar_uli_menejer.docx');
    expect(docFileName('obyektivka', { tabNumber: '5', lastName: 'Aliyev', firstName: 'Vali' })).toBe('5_Aliyev_Vali.docx');
  });
  it('файл номида тақиқланган белгилар йўқ (Windows/Linux)', () => {
    const n = docFileName('obyektivka', { ...emp, lastName: 'А/Б:В*Г?', tabNumber: '1\\2' });
    expect(n).not.toMatch(/[\\/:*?"<>|]/);
  });
  it('ўзбекча ҳарфлар: апостроф қолмайди', () => {
    expect(docFileName('obyektivka', { tabNumber: '7', lastName: 'Ғуломов', firstName: 'Ўктам' })).toBe('7_Gulomov_Oktam.docx');
  });
});

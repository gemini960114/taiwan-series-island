import cheerMeta from './cheer-metadata.json' with { type: 'json' };

// 2026 中華職棒台灣大賽「龍象大戰」資料
// 來源：維基百科〈2026年台灣大賽〉、Yahoo 運動（G4 先發打線）、自由時報（32 人名單）、
//       sgame.tw / 味全龍官網（小龍女 2026 陣容）、NOWnews（Passion Sisters 2026 陣容）、
//       TVBS / 三立 / NOWnews（颱風順延後賽程）
export const SITE = {
  brand: { big: ['TAIWAN', 'SERIES.'], title: '龍象大戰', sub: ['2026', '棒球島'] },
  eyebrow: 'THE GAME INDEX',
  headline: '龍與象，巨蛋決戰。',
  intro: '點一位球員或啦啦隊員，或到「賽程」查每一場。',
};

export const POS = { P: '投手', C: '捕手', '1B': '一壘手', '2B': '二壘手', '3B': '三壘手', SS: '游擊手', LF: '左外野手', CF: '中外野手', RF: '右外野手', DH: '指定打擊' };

export const TEAMS = {
  wc: {
    name: '味全龍', short: '味全', color: '#c8102e', dark: '#1d1d1f', side: 1,
    sp: '黃暐傑',
    lineup: [['李凱威', '2B'], ['郭天信', 'CF'], ['張政禹', 'SS'], ['劉基鴻', '3B'], ['朱育賢', '1B'],
      ['陳子豪', 'LF'], ['劉俊緯', 'DH'], ['林辰勳', 'C'], ['曾聖安', 'RF']],
    roster: {
      投手: ['李超', '陳禹勳', '林柏佑', '黃暐傑', '蔣銲', '鋼龍', '呂偉晟', '趙璟榮', '伍鐸', '陳冠偉', '曹祐齊', '林子昱', '林鋅杰', '梅賽鍶', '林凱威'],
      捕手: ['林辰勳', '蔣少宏', '姚冠瑋'],
      內野手: ['朱育賢', '李凱威', '劉俊緯', '張政禹', '李展毅', '劉基鴻', '拿莫．伊漾', '石翔宇'],
      外野手: ['陳子豪', '郭天信', '王順和', '張祐銘', '曾聖安', '張祐嘉'],
    },
  },
  ctbc: {
    name: '中信兄弟', short: '中信', color: '#f2c200', dark: '#1d1d1f', side: -1,
    sp: '鄭浩均',
    lineup: [['張仁瑋', '3B'], ['張士綸', '2B'], ['曾頌恩', 'RF'], ['王威晨', 'DH'], ['宋晟睿', 'CF'],
      ['詹子賢', 'LF'], ['江坤宇', 'SS'], ['高宇杰', 'C'], ['黃韋盛', '1B']],
    roster: {
      投手: ['魏碩成', '鄭凱文', '江忠城', '李振昌', '勝騎士', '羅戈', '鄭浩均', '菲力士', '余謙', '蔡齊哲', '曾品洋', '呂彥青', '陳琥', '謝榮豪', '伍立辰'],
      捕手: ['林吳晉瑋', '陳統恩', '高宇杰'],
      內野手: ['張士綸', '王威晨', '張仁瑋', '陳俊秀', '王政順', '黃韋盛', '江坤宇', '岳東華'],
      外野手: ['曾頌恩', '許庭綸', '詹子賢', '林志綱', '宋晟睿', '岳政華'],
    },
  },
};

// 賽程與結果（七戰四勝，全部在臺北大巨蛋）。
// line：逐局得分；null = 主隊最後半局免打（X）；walkoff = 主隊再見得分。start：台灣時間開打時刻。
// G5–G7 因強烈颱風薔琵順延一天（TVBS、三立、NOWnews 10/22 報導）。
export const SCHEDULE = [
  { g: 'G1', date: '10/17', wd: '六', away: 'ctbc', home: 'wc', venue: '臺北大巨蛋',
    line: { ctbc: [0, 0, 0, 0, 0, 0, 0, 0, 0], wc: [0, 0, 0, 0, 2, 1, 0, 0, null] },
    rhe: { ctbc: [0, 2, 0], wc: [3, 6, 1] }, wp: '蔣銲', lp: '勝騎士', sv: '林凱威', crowd: '40,000',
    note: '史上首次龍象台灣大賽，味全龍完封開局。' },
  { g: 'G2', date: '10/18', wd: '日', away: 'ctbc', home: 'wc', venue: '臺北大巨蛋',
    line: { ctbc: [0, 0, 0, 0, 1, 0, 0, 0, 0], wc: [0, 0, 0, 0, 3, 0, 0, 0, null] },
    rhe: { ctbc: [1, 6, 2], wc: [3, 4, 1] }, wp: '梅賽鍶', lp: '菲力士', sv: '林凱威', hr: '曾聖安', crowd: '39,568' },
  { g: 'G3', date: '10/20', wd: '二', away: 'wc', home: 'ctbc', venue: '臺北大巨蛋',
    line: { wc: [0, 0, 0, 0, 0, 0, 4, 0, 2], ctbc: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    rhe: { wc: [6, 6, 0], ctbc: [0, 1, 1] }, wp: '鋼龍', lp: '江忠城', crowd: '32,869',
    note: '味全龍聽牌，3 勝 0 敗。' },
  { g: 'G4', date: '10/21', wd: '三', away: 'wc', home: 'ctbc', venue: '臺北大巨蛋',
    line: { wc: [0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0], ctbc: [0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 1] }, walkoff: true,
    rhe: { wc: [4, 10, 0], ctbc: [5, 8, 0] }, wp: '菲力士', lp: '陳冠偉', crowd: '40,000',
    sp: '味全 黃暐傑 vs 中信 鄭浩均',
    note: '中信兄弟延長到 11 局下攻下致勝分，5:4 擊敗味全龍，系列戰扳回一勝。' },
  { g: 'G5', date: '10/24', wd: '六', time: '17:05', postponed: true, start: '2026-10-24T17:05:00+08:00', away: 'ctbc', home: 'wc', venue: '臺北大巨蛋',
    sp: '中信 伍立辰 vs 味全 蔣銲',
    note: '原訂 10/23（五），因強烈颱風薔琵襲台、台北市停班停課而順延一天。味全贏球即封王。' },
  { g: 'G6', date: '10/25', wd: '日', time: '17:05', postponed: true, start: '2026-10-25T17:05:00+08:00', away: 'ctbc', home: 'wc', venue: '臺北大巨蛋', ifNeeded: true,
    note: '颱風順延後的新日期。' },
  { g: 'G7', date: '10/26', wd: '一', time: '15:05', postponed: true, start: '2026-10-26T15:05:00+08:00', away: 'ctbc', home: 'wc', venue: '臺北大巨蛋', ifNeeded: true,
    note: '光復節補假，提早到下午 3:05 開打。' },
];
export const SCENE_GAME = 'G4'; // 場上球員取自這一場的先發陣容

// 啦啦隊（feature: true 的成員會站在應援台並顯示名牌）
export const CHEER = {
  wc: {
    squad: 'Dragon Beauties 小龍女',
    members: [
      { name: '李多慧', no: 82, role: 'Captain', kr: true, feature: true },
      { name: '金娜妍', no: 9, kr: true, feature: true },
      { name: '權喜原', no: 37, kr: true, feature: true },
      { name: '小映', no: 7, role: '隊長', feature: true },
      { name: '林襄', no: 95, role: '副隊長', feature: true },
      { name: '小蛙', no: 55, role: '舞蹈總監' },
      ...[['Yuri', 6], ['菲菲', 17], ['心璇', 25], ['馬妹', 41], ['口水 Trina', 18], ['芮妮', 4], ['賴可 LIKE', 13], ['張晴', 39],
        ['霖霖', 5], ['蘿拉 Laura', 19], ['詩雅', 44], ['璦昀', 22], ['沛沛', 24], ['寧寧', 92], ['佩霓', 90], ['靜靜', 99],
        ['群群', 35], ['瑄瑄'], ['姵宸', 30], ['貝拉', 86]].map(([name, no]) => ({ name, no })),
    ],
  },
  ctbc: {
    squad: 'Passion Sisters',
    members: [
      { name: '邊荷律', kr: true, feature: true },
      { name: '金渡兒', kr: true, feature: true, aka: '舊名金渡娥，有「仁川女神」之稱' },
      { name: 'JJUBI', kr: true, feature: true },
      { name: '妮可', role: '隊長', feature: true },
      { name: '曼容', role: '副隊長', feature: true },
      ...['峮峮', '短今', '貴貴', '凱蒂', '希希', '晴兒', '波波', '畇二', '林可', '君白', '沛婕', '汶汶', '夏蕾', 'Wendy',
        '怡琪', '少鹽', '牛奶', '芊芊', '衣宸', '瑄', '莎莎', '維尼', '璇璇', '珮含', '容容'].map(name => ({ name })),
      { name: '小迪', note: '香港籍' },
      { name: '菊池桃子', note: '日籍' },
    ],
  },
};

// 大頭貼 metadata：每張圖均明確記錄「這是誰」，不必再由檔名或陣容順序猜測。
// 可在瀏覽器以 CHEER_AVATAR_META 查詢完整對照表。
export const CHEER_AVATAR_META = [];
Object.entries(CHEER).forEach(([team, group]) => {
  group.members.forEach((member, index) => {
    const assetNo = String(index + 1).padStart(2, '0');
    member.avatarKey = `${team}/${team}-${assetNo}.png`;                 // key in cheer-metadata.json = original in art/cheer/
    member.avatar = `assets/cheer/${team}/${team}-${assetNo}.webp`;     // 512px, detail page only (npm run images)
    member.thumb = `assets/cheer/thumb/${team}-${assetNo}.webp`;         // 128px, name tags & lists (npm run images)
    member.aliases = cheerMeta.files[member.avatarKey]?.aliases ?? [];
    member.avatarMeta = {
      id: `${team}-${assetNo}`,
      person: member.name,
      team,
      teamName: TEAMS[team].name,
      squad: group.squad,
      file: member.avatar,
      ...(member.no != null ? { number: member.no } : {}),
      ...(member.role ? { role: member.role } : {}),
      ...(member.kr ? { nationality: '韓籍' } : {}),
      ...(member.note ? { note: member.note } : {}),
      ...(member.aka ? { aka: member.aka } : {}),
    };
    CHEER_AVATAR_META.push(member.avatarMeta);
  });
});

// handy for checking the mapping from the browser console
window.CHEER_AVATAR_META = CHEER_AVATAR_META;

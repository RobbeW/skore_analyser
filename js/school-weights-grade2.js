// Grade 2 weights (Sint-Lievenscollege, schooljaar 2026-2027), from the Skore "Overzicht gewichten".
// Compact storage: every Skore line is kept as is, with its numbers after "|" (in the order the
// pasted overview lists them: DW, EX, EXPA). A sub-line ("Frans: ...", "SE²AL - ...") belongs to the
// subject above it. Subjects without any weight in a period are left out of that period.
//
// Correction (confirmed by the school, 2026-11-15): in Skore, 3GLST SE²AL (1 hour) was weighted like
// 2 hours (parts 0.67 x 3) with an extra 1.5 in semester 2. It is stored here as 1 / 1.5 / 2.5,
// the rule for every 1-hour subject without an exam.

export const GRADE2_WEIGHTS_TEXT = `
1ste jaar 2de graad ASO / g2_j1_EWS / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Economie (4 uur) [ECO] (4 uur) | 4 12
Engels (2 uur) [ENG] (2 uur - Minor) | 4.8 3.2
Frans (4 uur) [FRA] (4 uur - major) | 6.4
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 2.88
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 6.72
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
ICT (1 uur) [ICT] (1 uur) | 1
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1 3
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 0.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 0.67
Wiskunde (5 uur) [WIS] (5 uur) | 5 15

1ste jaar 2de graad ASO / g2_j1_EWS / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Economie (4 uur) [ECO] (4 uur) | 6 9 9
Engels (2 uur) [ENG] (2 uur - Minor) | 7.2 4.8
Frans (4 uur) [FRA] (4 uur - major) | 4.8 4.8
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 4.3
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 10.1
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
ICT (1 uur) [ICT] (1 uur) | 1.5
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1.5 4.5
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 9.6
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1
Wiskunde (5 uur) [WIS] (5 uur) | 7.5 11.3 11.2

1ste jaar 2de graad ASO / g2_j1_EWS / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
ICT (1 uur) [ICT] (1 uur) | 2.5
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1.67

1ste jaar 2de graad ASO / g2_j1_EWTC / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Economie (4 uur) [ECO] (4 uur) | 4 12
Engels (3 uur) [ENG] (3 uur) | 7.2 4.8
Frans (5 uur) [FRA] (5 uur) | 8
Frans: Basiskennis (30%) [FrKennis] (5 uur) | 3.6
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (5 uur) | 8.4
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
ICT (1 uur) [ICT] (1 uur) | 1
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 0.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 0.67
Wiskunde (4 uur) [WIS] (4 uur) | 4 12

1ste jaar 2de graad ASO / g2_j1_EWTC / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Economie (4 uur) [ECO] (4 uur) | 6 9 9
Engels (3 uur) [ENG] (3 uur) | 10.8 7.2
Frans (5 uur) [FRA] (5 uur) | 6 6
Frans: Basiskennis (30%) [FrKennis] (5 uur) | 5.4
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (5 uur) | 12.6
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
ICT (1 uur) [ICT] (1 uur) | 1.5
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 9.6
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1
Wiskunde (4 uur) [WIS] (4 uur) | 6 9 9

1ste jaar 2de graad ASO / g2_j1_EWTC / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
ICT (1 uur) [ICT] (1 uur) | 2.5
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1.67

1ste jaar 2de graad ASO / g2_j1_GLST / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Engels (2 uur) [ENG] (2 uur - Minor) | 4.8 3.2
Frans (3 uur) [FRA] (3 uur) | 4.8
Frans: Basiskennis (30%) [Frkennis] (3 uur) | 2.16
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur) | 5.04
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
Grieks (4 uur) [GRI] (4 uur) | 4 12
ICT (1 uur) [ICT] (1 uur) | 1
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1 3
Latijn (4 uur) [LAT] (4 uur) | 4 12
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
Wiskunde (5 uur) [WIS] (5 uur) | 5 15
Se²AL (1 uur) [SEAL] (1 uur) | 1

1ste jaar 2de graad ASO / g2_j1_GLST / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Engels (2 uur) [ENG] (2 uur - Minor) | 7.2 4.8
Frans (3 uur) [FRA] (3 uur) | 3.6 3.6
Frans: Basiskennis (30%) [Frkennis] (3 uur) | 3.24
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur) | 7.56
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
Grieks (4 uur) [GRI] (4 uur) | 6 18
ICT (1 uur) [ICT] (1 uur) | 1.5
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1.5 4.5
Latijn (4 uur) [LAT] (4 uur) | 6 9 9
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 9.6
Wiskunde (5 uur) [WIS] (5 uur) | 7.5 11.3 11.2
Se²AL (1 uur) [SEAL] (1 uur) | 1.5

1ste jaar 2de graad ASO / g2_j1_GLST / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
ICT (1 uur) [ICT] (1 uur) | 2.5
Se²AL (1 uur) [SEAL] (1 uur) | 2.5

1ste jaar 2de graad ASO / g2_j1_GLTC / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Engels (2 uur) [ENG] (2 uur - Minor) | 4.8 3.2
Frans (3 uur) [FRA] (3 uur) | 4.8
Frans: Basiskennis (30%) [Frkennis] (3 uur) | 2.16
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur) | 5.04
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
Grieks (4 uur) [GRI] (4 uur) | 4 12
ICT (1 uur) [ICT] (1 uur) | 1
Latijn (4 uur) [LAT] (4 uur) | 4 12
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 0.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 0.67
Wiskunde (4 uur) [WIS] (4 uur) | 4 12

1ste jaar 2de graad ASO / g2_j1_GLTC / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Engels (2 uur) [ENG] (2 uur - Minor) | 7.2 4.8
Frans (3 uur) [FRA] (3 uur) | 3.6 3.6
Frans: Basiskennis (30%) [Frkennis] (3 uur) | 3.24
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur) | 7.56
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
Grieks (4 uur) [GRI] (4 uur) | 6 18
ICT (1 uur) [ICT] (1 uur) | 1.5
Latijn (4 uur) [LAT] (4 uur) | 6 9 9
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 9.6
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1
Wiskunde (4 uur) [WIS] (4 uur) | 6 9 9

1ste jaar 2de graad ASO / g2_j1_GLTC / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
ICT (1 uur) [ICT] (1 uur) | 2.5
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1.67

1ste jaar 2de graad ASO / g2_j1_HW / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Design Thinking & AI (1 uur) [DTAI] (1 uur) | 1
Engels (2 uur) [ENG] (2 uur - Minor) | 4.8 3.2
Filosofie (1 uur) [FIL] (1 uur) | 1 3
Frans (4 uur) [FRA] (4 uur - major) | 6.4
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 2.88
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 6.72
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
ICT (1 uur) [ICT] (1 uur) | 1
Kunstbeschouwing (1 uur) [KUN] (1 uur) | 1
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 0.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 0.67
Sociologie en Psychologie (3 uur) [SOC] (3 uur) | 4 8
Wiskunde (4 uur) [WIS] (4 uur) | 4 12

1ste jaar 2de graad ASO / g2_j1_HW / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Design Thinking & AI (1 uur) [DTAI] (1 uur) | 1.5
Engels (2 uur) [ENG] (2 uur - Minor) | 7.2 4.8
Filosofie (1 uur) [FIL] (1 uur) | 1.5 4.5
Frans (4 uur) [FRA] (4 uur - major) | 4.8 4.8
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 4.3
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 10.1
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
ICT (1 uur) [ICT] (1 uur) | 1.5
Kunstbeschouwing (1 uur) [KUN] (1 uur) | 1.5
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 9.6
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1
Sociologie en Psychologie (3 uur) [SOC] (3 uur) | 6 6 6
Wiskunde (4 uur) [WIS] (4 uur) | 6 9 9

1ste jaar 2de graad ASO / g2_j1_HW / Jaar
Design Thinking & AI (1 uur) [DTAI] (1 uur) | 2.5
Godsdienst (2 uur) [GOD] (2 uur) | 5
ICT (1 uur) [ICT] (1 uur) | 2.5
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1.67

1ste jaar 2de graad ASO / g2_j1_LST / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Engels (2 uur) [ENG] (2 uur - Minor) | 4.8 3.2
Frans (3 uur) [FRA] (3 uur) | 4.8
Frans: Basiskennis (30%) [Frkennis] (3 uur) | 2.16
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur) | 5.04
Fysica (2 uur) [Fys] (2 uur - zonder EXPA) | 2 6
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
ICT (1 uur) [ICT] (1 uur) | 1
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1 3
Latijn (5 uur) [LAT] (5 uur) | 5 15
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 0.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 0.67
Wiskunde (5 uur) [WIS] (5 uur) | 5 15

1ste jaar 2de graad ASO / g2_j1_LST / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Engels (2 uur) [ENG] (2 uur - Minor) | 7.2 4.8
Frans (3 uur) [FRA] (3 uur) | 3.6 3.6
Frans: Basiskennis (30%) [Frkennis] (3 uur) | 3.24
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur) | 7.56
Fysica (2 uur) [Fys] (2 uur - zonder EXPA) | 3 9
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
ICT (1 uur) [ICT] (1 uur) | 1.5
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1.5 4.5
Latijn (5 uur) [LAT] (5 uur) | 7.5 10 12.5
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 9.6
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1
Wiskunde (5 uur) [WIS] (5 uur) | 7.5 11.3 11.2

1ste jaar 2de graad ASO / g2_j1_LST / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
ICT (1 uur) [ICT] (1 uur) | 2.5
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1.67

1ste jaar 2de graad ASO / g2_j1_LTC / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Engels (3 uur) [ENG] (3 uur) | 7.2 4.8
Frans (4 uur) [FRA] (4 uur - major) | 6.4
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 2.88
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 6.72
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
ICT (1 uur) [ICT] (1 uur) | 1
Latijn (5 uur) [LAT] (5 uur) | 5 15
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 0.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 0.67
Wiskunde (4 uur) [WIS] (4 uur) | 4 12

1ste jaar 2de graad ASO / g2_j1_LTC / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Engels (3 uur) [ENG] (3 uur) | 10.8 7.2
Frans (4 uur) [FRA] (4 uur - major) | 4.8 4.8
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 4.3
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 10.1
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
ICT (1 uur) [ICT] (1 uur) | 1.5
Latijn (5 uur) [LAT] (5 uur) | 7.5 10 12.5
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 9.6
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1
Wiskunde (4 uur) [WIS] (4 uur) | 6 9 9

1ste jaar 2de graad ASO / g2_j1_LTC / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
ICT (1 uur) [ICT] (1 uur) | 2.5
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1.67

1ste jaar 2de graad ASO / g2_j1_MT / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Communicatie Wetenschappen en Taaltechnologie (3 uur) [COM] (3 uur) | 3 9
Design Thinking & AI (1 uur) [DTAI] (1 uur) | 1
Engels (4 uur) [ENG] (4 uur) | 9.6 6.4
Frans (5 uur) [FRA] (5 uur) | 8
Frans: Basiskennis (30%) [FrKennis] (5 uur) | 3.6
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (5 uur) | 8.4
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
ICT (1 uur) [ICT] (1 uur) | 1
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 0.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 0.67
Wiskunde (4 uur) [WIS] (4 uur) | 4 12

1ste jaar 2de graad ASO / g2_j1_MT / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Communicatie Wetenschappen en Taaltechnologie (3 uur) [COM] (3 uur) | 4.5 13.5
Design Thinking & AI (1 uur) [DTAI] (1 uur) | 1.5
Engels (4 uur) [ENG] (4 uur) | 14.4 4.8 4.8
Frans (5 uur) [FRA] (5 uur) | 6 6
Frans: Basiskennis (30%) [FrKennis] (5 uur) | 5.4
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (5 uur) | 12.6
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
ICT (1 uur) [ICT] (1 uur) | 1.5
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 9.6
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1
Wiskunde (4 uur) [WIS] (4 uur) | 6 9 9

1ste jaar 2de graad ASO / g2_j1_MT / Jaar
Design Thinking & AI (1 uur) [DTAI] (1 uur) | 2.5
Godsdienst (2 uur) [GOD] (2 uur) | 5
ICT (1 uur) [ICT] (1 uur) | 2.5
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1.67

1ste jaar 2de graad ASO / g2_j1_NW / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (2 uur) [BIO] (2 Uur) | 2 6
Chemie (2 uur) [CHE] (2 uur - Major) | 2 6
Design Thinking & AI (1 uur) [DTAI] (1 uur) | 1
Engels (2 uur) [ENG] (2 uur - Minor) | 4.8 3.2
Frans (4 uur) [FRA] (4 uur - major) | 6.4
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 2.88
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 6.72
Fysica (2 uur) [Fys] (2 uur - zonder EXPA) | 2 6
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
ICT (1 uur) [ICT] (1 uur) | 1
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1 3
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 0.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 0.67
Wiskunde (5 uur) [WIS] (5 uur) | 5 15

1ste jaar 2de graad ASO / g2_j1_NW / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (2 uur) [BIO] (2 Uur) | 3 9
Chemie (2 uur) [CHE] (2 uur - Major) | 3 9
Design Thinking & AI (1 uur) [DTAI] (1 uur) | 1.5
Engels (2 uur) [ENG] (2 uur - Minor) | 7.2 4.8
Frans (4 uur) [FRA] (4 uur - major) | 4.8 4.8
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 4.3
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 10.1
Fysica (2 uur) [Fys] (2 uur - zonder EXPA) | 3 9
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
ICT (1 uur) [ICT] (1 uur) | 1.5
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1.5 4.5
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 9.6
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1
Wiskunde (5 uur) [WIS] (5 uur) | 7.5 11.3 11.2

1ste jaar 2de graad ASO / g2_j1_NW / Jaar
Design Thinking & AI (1 uur) [DTAI] (1 uur) | 2.5
Godsdienst (2 uur) [GOD] (2 uur) | 5
ICT (1 uur) [ICT] (1 uur) | 2.5
SE²AL (2 uur) [SEAL] (2 uur)
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.67
SE²AL - Financiële Geletterdheid [SFG] (1 uur) | 1.67
SE²AL - Burgerschap en leren leren [SMS] (1 uur) | 1.67

2de jaar 2de graad ASO / g2_j2_EWS / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Duits (1 uur) [DUI] (1 uur) | 2.4 1.6
Economie (4 uur) [ECO] (4 uur) | 4 12
Engels (2 uur) [ENG] (2 uur - Minor) | 4.8 3.2
Frans (4 uur) [FRA] (4 uur - minor) | 6.4
Frans: Basiskennis (30%) [FrKennis] (4 uur - minor) | 2.88
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - minor) | 6.72
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1 3
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.5
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.5
Wiskunde (5 uur) [WIS] (5 uur) | 5 15

2de jaar 2de graad ASO / g2_j2_EWS / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Duits (1 uur) [DUI] (1 uur) | 3.6 2.4
Economie (4 uur) [ECO] (4 uur) | 6 10 8
Engels (2 uur) [ENG] (2 uur - Minor) | 7.2 4.8
Frans (4 uur) [FRA] (4 uur - minor) | 9.6
Frans: Basiskennis (30%) [FrKennis] (4 uur - minor) | 4.3
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - minor) | 10.1
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1.5 4.5
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 4.8 4.8
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.75
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.75
Wiskunde (5 uur) [WIS] (5 uur) | 7.5 11.3 11.2

2de jaar 2de graad ASO / g2_j2_EWS / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 1.25
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.25

2de jaar 2de graad ASO / g2_j2_EWTC / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Duits (1 uur) [DUI] (1 uur) | 2.4 1.6
Economie (4 uur) [ECO] (4 uur) | 4 12
Engels (3 uur) [ENG] (3 uur) | 7.2 4.8
Frans (4 uur) [FRA] (4 uur - major) | 6.4
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 2.88
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 6.72
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
Kunstbeschouwing (1 uur) [KUN] (1 uur) | 1
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.5
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.5
Wiskunde (4 uur) [WIS] (4 uur) | 4 12

2de jaar 2de graad ASO / g2_j2_EWTC / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Duits (1 uur) [DUI] (1 uur) | 3.6 2.4
Economie (4 uur) [ECO] (4 uur) | 6 10 8
Engels (3 uur) [ENG] (3 uur) | 10.8 7.2
Frans (4 uur) [FRA] (4 uur - major) | 4.8 4.8
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 4.3
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 10.1
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
Kunstbeschouwing (1 uur) [KUN] (1 uur) | 1.5
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 4.8 4.8
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.75
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.75
Wiskunde (4 uur) [WIS] (4 uur) | 6 18

2de jaar 2de graad ASO / g2_j2_EWTC / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 1.25
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.25

2de jaar 2de graad ASO / g2_j2_GLST / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Engels (2 uur) [ENG] (2 uur - Minor) | 4.8 3.2
Frans (3 uur) [FRA] (3 uur - minor) | 4.8
Frans: Basiskennis (30%) [FrKennis] (3 uur - minor) | 2.16
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur - minor) | 5.04
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
Grieks (4 uur) [GRI] (4 uur) | 4 12
Latijn (4 uur) [LAT] (4 uur) | 4 12
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.5
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.5
Wiskunde (5 uur) [WIS] (5 uur) | 5 15

2de jaar 2de graad ASO / g2_j2_GLST / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Engels (2 uur) [ENG] (2 uur - Minor) | 7.2 4.8
Frans (3 uur) [FRA] (3 uur - minor) | 7.2
Frans: Basiskennis (30%) [FrKennis] (3 uur - minor) | 3.24
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur - minor) | 7.56
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
Grieks (4 uur) [GRI] (4 uur) | 6 18
Latijn (4 uur) [LAT] (4 uur) | 6 10 8
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 4.8 4.8
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.75
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.75
Wiskunde (5 uur) [WIS] (5 uur) | 7.5 11.3 11.2

2de jaar 2de graad ASO / g2_j2_GLST / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 1.25
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.25

2de jaar 2de graad ASO / g2_j2_GLTC / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Duits (1 uur) [DUI] (1 uur) | 2.4 1.6
Engels (2 uur) [ENG] (2 uur - Minor) | 4.8 3.2
Frans (3 uur) [FRA] (3 uur - major) | 4.8
Frans: Basiskennis (30%) [FrKennis] (3 uur - major) | 2.16
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur - major) | 5.04
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
Grieks (4 uur) [GRI] (4 uur) | 4 12
Latijn (4 uur) [LAT] (4 uur) | 4 12
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.5
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.5
Wiskunde (4 uur) [WIS] (4 uur) | 4 12

2de jaar 2de graad ASO / g2_j2_GLTC / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Duits (1 uur) [DUI] (1 uur) | 3.6 2.4
Engels (2 uur) [ENG] (2 uur - Minor) | 7.2 4.8
Frans (3 uur) [FRA] (3 uur - major) | 3.6 3.6
Frans: Basiskennis (30%) [FrKennis] (3 uur - major) | 3.24
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur - major) | 7.56
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
Grieks (4 uur) [GRI] (4 uur) | 6 18
Latijn (4 uur) [LAT] (4 uur) | 6 10 8
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 4.8 4.8
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.75
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.75
Wiskunde (4 uur) [WIS] (4 uur) | 6 18

2de jaar 2de graad ASO / g2_j2_GLTC / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 1.25
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.25

2de jaar 2de graad ASO / g2_j2_HW / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Engels (2 uur) [ENG] (2 uur - Minor) | 4.8 3.2
Filosofie (2 uur) [FIL] (2 uur) | 2 6
Frans (4 uur) [FRA] (4 uur - major) | 6.4
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 6.72
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 2.88
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
Kunstbeschouwing (2 uur) [KUN] (2 uur) | 2 6
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
Sociologie en Psychologie (3 uur) [SOC] (3 uur) | 4 8
Wiskunde (4 uur) [WIS] (4 uur) | 4 12
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.5
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.5

2de jaar 2de graad ASO / g2_j2_HW / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Engels (2 uur) [ENG] (2 uur - Minor) | 7.2 4.8
Filosofie (2 uur) [FIL] (2 uur) | 3 9
Frans (4 uur) [FRA] (4 uur - major) | 4.8 4.8
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 10.1
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 4.3
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
Kunstbeschouwing (2 uur) [KUN] (2 uur) | 3 9
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 4.8 4.8
Sociologie en Psychologie (3 uur) [SOC] (3 uur) | 6 6 6
Wiskunde (4 uur) [WIS] (4 uur) | 6 18
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.75
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.75

2de jaar 2de graad ASO / g2_j2_HW / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 1.25
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.25

2de jaar 2de graad ASO / g2_j2_LST / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Duits (1 uur) [DUI] (1 uur) | 2.4 1.6
Engels (2 uur) [ENG] (2 uur - Minor) | 4.8 3.2
Frans (3 uur) [FRA] (3 uur - minor) | 4.8
Frans: Basiskennis (30%) [FrKennis] (3 uur - minor) | 2.16
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur - minor) | 5.04
Fysica (2 uur) [Fys] (2 uur - zonder EXPA) | 2 6
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1 3
Latijn (5 uur) [LAT] (5 uur) | 5 15
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.5
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.5
Wiskunde (5 uur) [WIS] (5 uur) | 5 15

2de jaar 2de graad ASO / g2_j2_LST / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Duits (1 uur) [DUI] (1 uur) | 3.6 2.4
Engels (2 uur) [ENG] (2 uur - Minor) | 7.2 4.8
Frans (3 uur) [FRA] (3 uur - minor) | 7.2
Frans: Basiskennis (30%) [FrKennis] (3 uur - minor) | 3.24
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur - minor) | 7.56
Fysica (2 uur) [Fys] (2 uur - zonder EXPA) | 3 9
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1.5 4.5
Latijn (5 uur) [LAT] (5 uur) | 7.5 12.5 10
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 4.8 4.8
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.75
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.75
Wiskunde (5 uur) [WIS] (5 uur) | 7.5 11.3 11.2

2de jaar 2de graad ASO / g2_j2_LST / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 1.25
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.25

2de jaar 2de graad ASO / g2_j2_LTC / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Duits (1 uur) [DUI] (1 uur) | 2.4 1.6
Engels (3 uur) [ENG] (3 uur) | 7.2 4.8
Frans (3 uur) [FRA] (3 uur - major) | 4.8
Frans: Basiskennis (30%) [FrKennis] (3 uur - major) | 2.16
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur - major) | 5.04
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
Kunstbeschouwing (1 uur) [KUN] (1 uur) | 1
Latijn (5 uur) [LAT] (5 uur) | 5 15
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.5
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.5
Wiskunde (4 uur) [WIS] (4 uur) | 4 12

2de jaar 2de graad ASO / g2_j2_LTC / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Duits (1 uur) [DUI] (1 uur) | 3.6 2.4
Engels (3 uur) [ENG] (3 uur) | 10.8 7.2
Frans (3 uur) [FRA] (3 uur - major) | 3.6 3.6
Frans: Basiskennis (30%) [FrKennis] (3 uur - major) | 3.24
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (3 uur - major) | 7.56
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
Kunstbeschouwing (1 uur) [KUN] (1 uur) | 1.5
Latijn (5 uur) [LAT] (5 uur) | 7.5 12.5 10
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 4.8 4.8
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.75
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.75
Wiskunde (4 uur) [WIS] (4 uur) | 6 18

2de jaar 2de graad ASO / g2_j2_LTC / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 1.25
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.25

2de jaar 2de graad ASO / g2_j2_MT / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (1 uur) [BIO] (1 Uur) | 1 3
Chemie (1 uur) [CHE] (1 uur) | 1 3
Communicatie Wetenschappen en Taaltechnologie (2 uur) [COM] (2 uur) | 2 6
Duits (2 uur) [DUI] (2 uur) | 4.8 3.2
Engels (4 uur) [ENG] (4 uur) | 9.6 6.4
Frans (5 uur) [FRA] (5 uur) | 8
Frans: Basiskennis (30%) [FrKennis] (5 uur) | 3.6
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (5 uur) | 8.4
Fysica (1 uur) [FYS] (1 uur) | 1 3
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.5
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.5
Wiskunde (4 uur) [WIS] (4 uur) | 4 12

2de jaar 2de graad ASO / g2_j2_MT / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (1 uur) [BIO] (1 Uur) | 1.5 4.5
Chemie (1 uur) [CHE] (1 uur) | 1.5 4.5
Communicatie Wetenschappen en Taaltechnologie (2 uur) [COM] (2 uur) | 3 9
Duits (2 uur) [DUI] (2 uur) | 7.2 4.8
Engels (4 uur) [ENG] (4 uur) | 14.4 4.8 4.8
Frans (5 uur) [FRA] (5 uur) | 6 6
Frans: Basiskennis (30%) [FrKennis] (5 uur) | 5.4
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (5 uur) | 12.6
Fysica (1 uur) [FYS] (1 uur) | 1.5 4.5
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 4.8 4.8
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.75
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.75
Wiskunde (4 uur) [WIS] (4 uur) | 6 18

2de jaar 2de graad ASO / g2_j2_MT / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 1.25
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.25

2de jaar 2de graad ASO / g2_j2_NW / Semester 1
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1 3
Biologie (2 uur) [BIO] (2 Uur) | 2 6
Chemie (2 uur) [CHE] (2 uur - Major) | 2 6
Duits (1 uur) [DUI] (1 uur) | 2.4 1.6
Engels (3 uur) [ENG] (3 uur) | 7.2 4.8
Frans (4 uur) [FRA] (4 uur - minor) | 6.4
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 2.88
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 6.72
Geschiedenis (2 uur) [GES] (2 uur) | 2 6
Fysica (2 uur) [Fys] (2 uur - zonder EXPA) | 2 6
Godsdienst (2 uur) [GOD] (2 uur) | 2
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1 3
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 2
Nederlands (4 uur) [NED] (4 uur) | 9.6 6.4
Wiskunde (5 uur) [WIS] (5 uur) | 5 15
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.5
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.5

2de jaar 2de graad ASO / g2_j2_NW / Semester 2
Aardrijkskunde (1 uur) [AAR] (1 uur) | 1.5 4.5
Biologie (2 uur) [BIO] (2 Uur) | 3 9
Chemie (2 uur) [CHE] (2 uur - Major) | 3 5 4
Duits (1 uur) [DUI] (1 uur) | 3.6 2.4
Engels (3 uur) [ENG] (3 uur) | 10.8 7.2
Frans (4 uur) [FRA] (4 uur - minor) | 9.6
Frans: Basiskennis (30%) [FrKennis] (4 uur - major) | 4.3
Frans: Vaardigheden en Nieuw (70%) [FrVaar] (4 uur - major) | 10.1
Geschiedenis (2 uur) [GES] (2 uur) | 3 9
Fysica (2 uur) [Fys] (2 uur - zonder EXPA) | 3 9
Godsdienst (2 uur) [GOD] (2 uur) | 3
Informaticawetenschappen (1 uur ) [IW] (1 uur - major) | 1.5 4.5
Lichamelijke opvoeding (2 uur) [LOP] (2 uur) | 3
Nederlands (4 uur) [NED] (4 uur) | 14.4 4.8 4.8
Wiskunde (5 uur) [WIS] (5 uur) | 7.5 11.3 11.2
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 0.75
SE²AL - Artistieke Vorming [SAV] (1 uur) | 0.75

2de jaar 2de graad ASO / g2_j2_NW / Jaar
Godsdienst (2 uur) [GOD] (2 uur) | 5
Se²AL (1 uur) [SEAL] (1 uur)
SE²AL - ICT [SICT] (1 uur) | 1.25
SE²AL - Artistieke Vorming [SAV] (1 uur) | 1.25
`;

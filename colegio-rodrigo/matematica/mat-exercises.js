// Matematica Exercises Data - Colegio Rodrigo 6to Grado (Nivel Avanzado)
var units=[
{
id:'u1',title:'UNIDAD 01 – Divisores y Divisibilidad',color:'green',icon:'➗',
topics:[
{
title:'Cantidad de divisores de un número',
exercises:[
{type:'mc',q:'¿Cuántos divisores tiene el número 180? (180 = 2²×3²×5¹)',options:['12','15','18','20'],answer:2,exp:'180 = 2²×3²×5¹ → (2+1)(2+1)(1+1) = 3×3×2 = 18 divisores'},
{type:'mc',q:'¿Cuántos divisores tiene el número 72? (72 = 2³×3²)',options:['8','10','12','14'],answer:2,exp:'72 = 2³×3² → (3+1)(2+1) = 4×3 = 12 divisores'},
{type:'fill',q:'¿Cuántos divisores tiene el número 48? (48 = 2⁴×3¹)',answer:'10',exp:'48 = 2⁴×3¹ → (4+1)(1+1) = 5×2 = 10 divisores'},
{type:'mc',q:'Un número tiene descomposición 2⁴×3³×5². ¿Cuántos divisores tiene?',options:['30','45','60','90'],answer:2,exp:'(4+1)(3+1)(2+1) = 5×4×3 = 60 divisores'},
{type:'mc',q:'¿Cuántos divisores tiene el número 360? (360 = 2³×3²×5¹)',options:['18','20','24','28'],answer:2,exp:'360 = 2³×3²×5¹ → (3+1)(2+1)(1+1) = 4×3×2 = 24 divisores'},
{type:'fill',q:'¿Cuántos divisores tiene el número 200? (200 = 2³×5²)',answer:'12',exp:'200 = 2³×5² → (3+1)(2+1) = 4×3 = 12 divisores'},
{type:'mc',q:'Si un número tiene 15 divisores, ¿cuál podría ser su forma?',options:['p¹⁴','p²×q⁴','p⁴×q²','Todas las anteriores'],answer:3,exp:'15 = 15×1 → p¹⁴; o 15 = 5×3 → p⁴×q². Todas son posibles formas.'},
{type:'mc',q:'¿Cuántos divisores tiene el número 144? (144 = 2⁴×3²)',options:['12','15','18','20'],answer:2,exp:'144 = 2⁴×3² → (4+1)(2+1) = 5×3 = 15 divisores'},
{type:'fill',q:'¿Cuántos divisores tiene 540? (540 = 2²×3³×5¹)',answer:'24',exp:'540 = 2²×3³×5¹ → (2+1)(3+1)(1+1) = 3×4×2 = 24 divisores'},
{type:'mc',q:'¿Cuántos divisores tiene el número 900? (900 = 2²×3²×5²)',options:['18','24','27','30'],answer:2,exp:'900 = 2²×3²×5² → (2+1)(2+1)(2+1) = 3×3×3 = 27 divisores'}
]
},
{
title:'Suma de divisores de un número',
exercises:[
{type:'mc',q:'¿Cuál es la suma de los divisores de 28? (28 = 2²×7¹)',options:['48','56','60','64'],answer:1,exp:'σ(28) = (2³-1)/(2-1) × (7²-1)/(7-1) = 7×8 = 56. Divisores: {1,2,4,7,14,28}'},
{type:'fill',q:'¿Cuál es la suma de los divisores de 18? (18 = 2×3²)',answer:'39',exp:'Divisores: {1,2,3,6,9,18} → 1+2+3+6+9+18 = 39'},
{type:'mc',q:'¿Cuál es la suma de los divisores de 24? (24 = 2³×3)',options:['48','52','60','64'],answer:2,exp:'Divisores: {1,2,3,4,6,8,12,24} → 1+2+3+4+6+8+12+24 = 60'},
{type:'mc',q:'¿Cuál es la suma de los divisores de 72? (72 = 2³×3²)',options:['180','186','195','210'],answer:2,exp:'σ(72) = (2⁴-1)/(2-1) × (3³-1)/(3-1) = 15×13 = 195'},
{type:'fill',q:'¿Cuál es la suma de los divisores de 20? (20 = 2²×5)',answer:'42',exp:'Divisores: {1,2,4,5,10,20} → 1+2+4+5+10+20 = 42'},
{type:'mc',q:'¿Cuál es la suma de los divisores de 45? (45 = 3²×5)',options:['60','72','78','84'],answer:2,exp:'Divisores: {1,3,5,9,15,45} → 1+3+5+9+15+45 = 78'},
{type:'mc',q:'¿Cuál es la suma de los divisores de 100? (100 = 2²×5²)',options:['200','217','234','250'],answer:1,exp:'σ(100) = (2³-1)/(2-1) × (5³-1)/(5-1) = 7×31 = 217'},
{type:'fill',q:'¿Cuál es la suma de los divisores de 32? (32 = 2⁵)',answer:'63',exp:'Divisores: {1,2,4,8,16,32} → 1+2+4+8+16+32 = 63'},
{type:'mc',q:'¿Cuál es la suma de los divisores de 60? (60 = 2²×3×5)',options:['144','156','168','180'],answer:2,exp:'σ(60) = 7×4×6 = 168. Divisores: {1,2,3,4,5,6,10,12,15,20,30,60}'},
{type:'mc',q:'Un número perfecto es igual a la suma de sus divisores propios. ¿Cuál de estos es perfecto?',options:['12','24','28','36'],answer:2,exp:'28: divisores propios = {1,2,4,7,14} → 1+2+4+7+14 = 28. ¡Es perfecto!'}
]
},
{
title:'Divisibilidad (Teoría de números)',
exercises:[
{type:'mc',q:'¿Cuál de estos números es divisible por 11?',options:['1331','1452','2541','3683'],answer:0,exp:'Regla del 11: suma alternada de dígitos. 1-3+3-1 = 0, que es múltiplo de 11. 1331 = 11³'},
{type:'mc',q:'¿Cuál es el MCD de 84 y 126?',options:['14','21','42','63'],answer:2,exp:'84 = 2²×3×7, 126 = 2×3²×7 → MCD = 2×3×7 = 42'},
{type:'fill',q:'¿Cuál es el MCM de 12, 18 y 24?',answer:'72',exp:'12=2²×3, 18=2×3², 24=2³×3 → MCM = 2³×3² = 72'},
{type:'mc',q:'¿Cuál de estos números es divisible por 7?',options:['833','945','1024','1157'],answer:0,exp:'833÷7 = 119. Para verificar: 83-3×2 = 77, y 77÷7 = 11 ✓'},
{type:'mc',q:'¿Cuál es el MCD de 135 y 180?',options:['15','30','45','60'],answer:2,exp:'135 = 3³×5, 180 = 2²×3²×5 → MCD = 3²×5 = 45'},
{type:'fill',q:'¿Cuál es el MCM de 15 y 20?',answer:'60',exp:'15 = 3×5, 20 = 2²×5 → MCM = 2²×3×5 = 60'},
{type:'mc',q:'Si un número de 3 cifras termina en 5 y la suma de sus dígitos es 15, ¿por cuánto es divisible?',options:['Solo por 5','Por 3 y por 5','Por 3, 5 y 15','Por 5 y por 9'],answer:2,exp:'Termina en 5 → divisible por 5. Suma = 15 → divisible por 3 y por 15. Como 15 incluye 3 y 5, es divisible por 3, 5 y 15.'},
{type:'mc',q:'¿Cuál de estos números es divisible por 8?',options:['1234','3456','5678','7890'],answer:1,exp:'Regla del 8: las 3 últimas cifras deben ser múltiplo de 8. 456÷8 = 57 ✓'},
{type:'mc',q:'¿Cuál es el MCM de 24 y 36?',options:['48','72','108','144'],answer:1,exp:'24 = 2³×3, 36 = 2²×3² → MCM = 2³×3² = 72'},
{type:'fill',q:'¿Cuántos números primos hay entre 20 y 40?',answer:'4',exp:'Los primos entre 20 y 40 son: 23, 29, 31, 37. Solo estos 4 números no tienen divisores besides 1 y themselves.'}
]
}
]
},
{
id:'u2',title:'UNIDAD 02 – Operaciones Naturales',color:'blue',icon:'✖️',
topics:[
{
title:'Multiplicación de números naturales',
exercises:[
{type:'fill',q:'Calcula: 234 × 12 = ?',answer:'2808',exp:'234×12 = 234×10 + 234×2 = 2340 + 468 = 2808'},
{type:'mc',q:'Calcula: 156 × 23 = ?',options:['3388','3588','3688','3788'],answer:1,exp:'156×23 = 156×20 + 156×3 = 3120 + 468 = 3588'},
{type:'fill',q:'Calcula: 345 × 15 = ?',answer:'5175',exp:'345×15 = 345×10 + 345×5 = 3450 + 1725 = 5175'},
{type:'mc',q:'Calcula: 478 × 26 = ?',options:['12228','12428','12628','12828'],answer:1,exp:'478×26 = 478×20 + 478×6 = 9560 + 2868 = 12428'},
{type:'mc',q:'Un camión transporta 345 cajas. Cada caja tiene 24 botellas. ¿Cuántas botellas hay en total?',options:['7280','8080','8280','8480'],answer:2,exp:'345×24 = 345×20 + 345×4 = 6900 + 1380 = 8280 botellas'},
{type:'fill',q:'Calcula: 567 × 34 = ?',answer:'19278',exp:'567×34 = 567×30 + 567×4 = 17010 + 2268 = 19278'},
{type:'mc',q:'Calcula: 289 × 45 = ?',options:['12905','13005','13105','13205'],answer:1,exp:'289×45 = 289×40 + 289×5 = 11560 + 1445 = 13005'},
{type:'mc',q:'En una granja hay 18 gallineros con 35 gallinas cada uno. ¿Cuántas gallinas hay en total?',options:['530','630','730','830'],answer:1,exp:'18×35 = 18×30 + 18×5 = 540 + 90 = 630 gallinas'},
{type:'fill',q:'Calcula: 612 × 18 = ?',answer:'11016',exp:'612×18 = 612×20 - 612×2 = 12240 - 1224 = 11016'},
{type:'mc',q:'Calcula: 789 × 32 = ?',options:['24248','25248','26248','27248'],answer:1,exp:'789×32 = 789×30 + 789×2 = 23670 + 1578 = 25248'}
]
},
{
title:'División de números naturales',
exercises:[
{type:'fill',q:'Calcula: 4536 ÷ 24 = ?',answer:'189',exp:'4536÷24 = 189. Verificación: 189×24 = 4536'},
{type:'mc',q:'Calcula: 7832 ÷ 16 = ?',options:['489','498','509','519'],answer:0,exp:'7832÷16 = 489. Verificación: 489×16 = 7832'},
{type:'fill',q:'Calcula: 6048 ÷ 36 = ?',answer:'168',exp:'6048÷36 = 168. Verificación: 168×36 = 6048'},
{type:'mc',q:'Un agricultor tiene 4750 naranjas y las empaqueta en cajas de 25. ¿Cuántas cajas completa?',options:['180','190','200','210'],answer:1,exp:'4750÷25 = 190 cajas completas'},
{type:'mc',q:'Calcula: 9285 ÷ 45 = ?',options:['205','206','207','208'],answer:1,exp:'9285÷45 = 206 con resto 15. Verificación: 206×45 = 9270, 9285-9270 = 15'},
{type:'fill',q:'¿Cuál es el cociente y el resto de 3747 ÷ 28? (escribe el cociente)',answer:'133',exp:'3747÷28 = 133 con resto 23. Verificación: 133×28 = 3724, 3747-3724 = 23'},
{type:'mc',q:'Una escuela tiene 3456 estudiantes y los distribuye en 32 aulas. ¿Cuántos estudiantes hay por aula?',options:['98','108','118','128'],answer:1,exp:'3456÷32 = 108 estudiantes por aula'},
{type:'mc',q:'¿Cuál es el resto de 8743 ÷ 17?',options:['5','6','7','8'],answer:0,exp:'8743÷17 = 514 con resto 5. Verificación: 514×17 = 8738, 8743-8738 = 5. El resto es 5.'},
{type:'fill',q:'Calcula: 5184 ÷ 48 = ?',answer:'108',exp:'5184÷48 = 108. Verificación: 108×48 = 5184'},
{type:'mc',q:'Si 2345 ÷ 12 = 195 con resto r, ¿cuánto vale r?',options:['3','5','7','9'],answer:1,exp:'195×12 = 2340, 2345-2340 = 5. El resto es 5.'}
]
}
]
},
{
id:'u3',title:'UNIDAD 03 – Estadística',color:'purple',icon:'📊',
topics:[
{
title:'Media aritmética, moda y mediana',
exercises:[
{type:'fill',q:'Calcula la media de: 12, 18, 24, 30, 36',answer:'24',exp:'Media = (12+18+24+30+36)÷5 = 120÷5 = 24'},
{type:'mc',q:'Calcula la media de: 7, 12, 15, 18, 23',options:['12','13','15','14'],answer:2,exp:'Media = (7+12+15+18+23)÷5 = 75÷5 = 15'},
{type:'mc',q:'¿Cuál es la moda y la mediana de: 4, 8, 6, 4, 9, 4, 7?',options:['Moda=4, Mediana=6','Moda=4, Mediana=7','Moda=8, Mediana=6','Moda=4, Mediana=4'],answer:0,exp:'Ordenados: 4,4,4,6,7,8,9. Moda=4 (aparece 3 veces). Mediana=6 (valor central, 7 datos).'},
{type:'fill',q:'Calcula la media de: 15, 25, 35, 45, 55',answer:'35',exp:'Media = (15+25+35+45+55)÷5 = 175÷5 = 35'},
{type:'mc',q:'Si la media de 5 números es 18 y cuatro de ellos son 12, 15, 20, 24, ¿cuál es el quinto?',options:['15','18','19','21'],answer:2,exp:'Suma total = 18×5 = 90. 12+15+20+24 = 71. Quinto = 90-71 = 19'},
{type:'mc',q:'¿Cuál es la mediana de: 8, 3, 15, 7, 12, 6, 20, 11?',options:['9.5','10','10.5','11'],answer:0,exp:'Ordenados: 3,6,7,8,11,12,15,20. 8 datos → mediana = (8+11)÷2 = 9.5'},
{type:'fill',q:'Si la media de 4 números es 25, ¿cuál es la suma total de los 4 números?',answer:'100',exp:'Suma = media × cantidad = 25×4 = 100'},
{type:'mc',q:'¿Cuál es la moda de: 10, 15, 10, 20, 15, 10, 25, 15?',options:['10','15','10 y 15','No hay moda'],answer:2,exp:'El 10 aparece 3 veces y el 15 aparece 3 veces. Es bimodal: 10 y 15.'},
{type:'mc',q:'Calcula la media de: 14, 22, 18, 26, 30, 10',options:['18','20','22','24'],answer:1,exp:'Media = (14+22+18+26+30+10)÷6 = 120÷6 = 20'},
{type:'fill',q:'¿Cuál es la mediana de: 5, 12, 8, 3, 17, 9, 14, 6?',answer:'8.5',exp:'Ordenados: 3,5,6,8,9,12,14,17. 8 datos → mediana = (8+9)÷2 = 8.5'}
]
},
{
title:'Tabla de frecuencia',
exercises:[
{type:'mc',q:'Dados los valores: 3,5,5,7,7,7,9,9,9,9. ¿Cuál es la frecuencia absoluta del valor 9?',options:['2','3','4','5'],answer:2,exp:'El 9 aparece 4 veces en los datos: 3,5,5,7,7,7,9,9,9,9'},
{type:'fill',q:'Si fi=8 y N=40, ¿cuál es la frecuencia relativa hi? (decimal)',answer:'0.2',exp:'hi = fi÷N = 8÷40 = 0.2'},
{type:'mc',q:'En una tabla, las frecuencias absolutas son: fi₁=5, fi₂=8, fi₃=7, fi₄=10. ¿Cuánto vale N?',options:['25','28','30','32'],answer:2,exp:'N = 5+8+7+10 = 30'},
{type:'mc',q:'Si la frecuencia acumulada Fi del tercer valor es 20 y fi₄=6, ¿cuál es Fi₄?',options:['24','26','28','30'],answer:1,exp:'Fi₄ = Fi₃ + fi₄ = 20+6 = 26'},
{type:'fill',q:'Si hi=0.35 y N=60, ¿cuál es la frecuencia absoluta fi?',answer:'21',exp:'fi = hi×N = 0.35×60 = 21'},
{type:'mc',q:'Si el porcentaje de un dato es 25% y N=80, ¿cuál es su frecuencia absoluta?',options:['16','20','24','28'],answer:1,exp:'fi = (porcentaje÷100)×N = (25÷100)×80 = 20'},
{type:'mc',q:'Las frecuencias relativas de 4 valores son: 0.15, 0.25, 0.30, hi₄. ¿Cuánto vale hi₄?',options:['0.25','0.30','0.35','0.40'],answer:1,exp:'La suma de todas las hi debe ser 1. hi₄ = 1-(0.15+0.25+0.30) = 1-0.70 = 0.30'},
{type:'fill',q:'Si fi=12 y el porcentaje es 30%, ¿cuánto vale N?',answer:'40',exp:'N = fi÷(porcentaje÷100) = 12÷0.30 = 40'},
{type:'mc',q:'En una tabla de frecuencia con 5 datos diferentes, ¿cuál es la suma de todas las frecuencias relativas hi?',options:['0.5','1','5','Depende de los datos'],answer:1,exp:'La suma de todas las frecuencias relativas (hi) siempre es 1 (o 100%).'},
{type:'mc',q:'Si fi=15, N=75, ¿cuál es el porcentaje redondeado?',options:['15%','20%','25%','30%'],answer:1,exp:'hi = 15÷75 = 0.20 → Porcentaje = 0.20×100 = 20%'}
]
}
]
}
];
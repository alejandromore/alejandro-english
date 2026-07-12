// Matematica Exercises Data - Colegio Rodrigo 6to Grado
var units=[
{
id:'u1',title:'UNIDAD 01 – Divisores y Divisibilidad',color:'green',icon:'➗',
topics:[
{
title:'Cantidad de divisores de un número',
exercises:[
{type:'mc',q:'¿Cuántos divisores tiene el número 12?',options:['4','5','6','8'],answer:2,exp:'12 = 2²×3¹ → (2+1)(1+1) = 3×2 = 6 divisores: {1,2,3,4,6,12}'},
{type:'mc',q:'¿Cuántos divisores tiene el número 15?',options:['3','4','5','6'],answer:1,exp:'15 = 3¹×5¹ → (1+1)(1+1) = 2×2 = 4 divisores: {1,3,5,15}'},
{type:'mc',q:'¿Cuántos divisores tiene el número 7?',options:['1','2','3','4'],answer:1,exp:'7 es primo → solo tiene 2 divisores: {1,7}'},
{type:'mc',q:'¿Cuántos divisores tiene el número 36?',options:['6','8','9','12'],answer:2,exp:'36 = 2²×3² → (2+1)(2+1) = 3×3 = 9 divisores'},
{type:'fill',q:'¿Cuántos divisores tiene el número 10? (10 = 2×5)',answer:'4',exp:'10 = 2¹×5¹ → (1+1)(1+1) = 4 divisores: {1,2,5,10}'},
{type:'mc',q:'¿Cuántos divisores tiene el número 100?',options:['6','8','9','10'],answer:2,exp:'100 = 2²×5² → (2+1)(2+1) = 9 divisores'},
{type:'mc',q:'¿Cuántos divisores tiene el número 8?',options:['2','3','4','5'],answer:2,exp:'8 = 2³ → (3+1) = 4 divisores: {1,2,4,8}'},
{type:'fill',q:'¿Cuántos divisores tiene el número 6? (6 = 2×3)',answer:'4',exp:'6 = 2¹×3¹ → (1+1)(1+1) = 4 divisores: {1,2,3,6}'},
{type:'mc',q:'¿Cuántos divisores tiene el número 24?',options:['6','7','8','10'],answer:2,exp:'24 = 2³×3¹ → (3+1)(1+1) = 8 divisores'},
{type:'mc',q:'Si un número tiene descomposición 2³×3², ¿cuántos divisores tiene?',options:['6','9','12','15'],answer:2,exp:'(3+1)(2+1) = 4×3 = 12 divisores'}
]
},
{
title:'Suma de divisores de un número',
exercises:[
{type:'mc',q:'¿Cuál es la suma de los divisores de 6?',options:['8','10','12','14'],answer:2,exp:'Divisores de 6: {1,2,3,6} → 1+2+3+6 = 12'},
{type:'mc',q:'¿Cuál es la suma de los divisores de 10?',options:['12','14','18','20'],answer:2,exp:'Divisores de 10: {1,2,5,10} → 1+2+5+10 = 18'},
{type:'fill',q:'¿Cuál es la suma de los divisores de 4? (divisores: 1,2,4)',answer:'7',exp:'1+2+4 = 7'},
{type:'mc',q:'¿Cuál es la suma de los divisores de 12?',options:['20','24','28','30'],answer:2,exp:'Divisores de 12: {1,2,3,4,6,12} → 1+2+3+4+6+12 = 28'},
{type:'mc',q:'¿Cuál es la suma de los divisores de 9?',options:['10','12','13','15'],answer:2,exp:'Divisores de 9: {1,3,9} → 1+3+9 = 13'},
{type:'fill',q:'¿Cuál es la suma de los divisores de 8? (divisores: 1,2,4,8)',answer:'15',exp:'1+2+4+8 = 15'},
{type:'mc',q:'¿Cuál es la suma de los divisores de 15?',options:['20','24','28','30'],answer:1,exp:'Divisores de 15: {1,3,5,15} → 1+3+5+15 = 24'},
{type:'mc',q:'¿Cuál es la suma de los divisores de 7?',options:['7','8','9','10'],answer:1,exp:'7 es primo → divisores: {1,7} → 1+7 = 8'},
{type:'mc',q:'¿Cuál es la suma de los divisores de 28?',options:['48','56','60','64'],answer:1,exp:'Divisores de 28: {1,2,4,7,14,28} → 1+2+4+7+14+28 = 56'},
{type:'fill',q:'¿Cuál es la suma de los divisores de 5? (5 es primo)',answer:'6',exp:'5 es primo → divisores: {1,5} → 1+5 = 6'}
]
},
{
title:'Divisibilidad (Teoría de números)',
exercises:[
{type:'mc',q:'¿Cuál de estos números es divisible por 2?',options:['35','47','58','61'],answer:2,exp:'Un número es divisible por 2 si termina en 0,2,4,6,8. 58 termina en 8.'},
{type:'mc',q:'¿Cuál de estos números es divisible por 3?',options:['14','25','36','47'],answer:2,exp:'Un número es divisible por 3 si la suma de sus dígitos es múltiplo de 3. 3+6=9, que es múltiplo de 3.'},
{type:'mc',q:'¿Cuál de estos números es divisible por 5?',options:['42','55','68','73'],answer:1,exp:'Un número es divisible por 5 si termina en 0 o 5. 55 termina en 5.'},
{type:'mc',q:'¿Cuál de estos números es divisible por 9?',options:['18','26','34','43'],answer:0,exp:'Un número es divisible por 9 si la suma de sus dígitos es múltiplo de 9. 1+8=9.'},
{type:'fill',q:'¿Es 72 divisible por 4? (sí/no)',answer:'si',exp:'72÷4=18. Un número es divisible por 4 si sus dos últimos dígitos forman un múltiplo de 4.'},
{type:'mc',q:'¿Cuál de estos números es primo?',options:['9','15','21','23'],answer:3,exp:'23 solo tiene 2 divisores: 1 y 23. Los demás son compuestos.'},
{type:'mc',q:'¿Cuál es el MCD de 12 y 18?',options:['2','3','6','9'],answer:2,exp:'MCD(12,18): 12=2²×3, 18=2×3² → MCD=2×3=6'},
{type:'mc',q:'¿Cuál es el MCM de 4 y 6?',options:['12','18','24','30'],answer:0,exp:'MCM(4,6): 4=2², 6=2×3 → MCM=2²×3=12'},
{type:'mc',q:'¿Cuál de estos números es divisible por 6?',options:['22','35','48','51'],answer:2,exp:'Un número es divisible por 6 si lo es por 2 y por 3. 48 es par y 4+8=12 (múltiplo de 3).'},
{type:'fill',q:'¿Cuál es el MCD de 8 y 12?',answer:'4',exp:'MCD(8,12): 8=2³, 12=2²×3 → MCD=2²=4'}
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
{type:'fill',q:'Calcula: 25 × 4 = ?',answer:'100',exp:'25×4 = 100. Veinte cinco por cuatro es cien.'},
{type:'mc',q:'Calcula: 13 × 7 = ?',options:['81','91','101','91'],answer:1,exp:'13×7 = 91. Trece por siete es noventa y uno.'},
{type:'fill',q:'Calcula: 8 × 12 = ?',answer:'96',exp:'8×12 = 96. Ocho por doce es noventa y seis.'},
{type:'mc',q:'Calcula: 47 × 6 = ?',options:['252','282','272','292'],answer:1,exp:'47×6 = 282. Cuarenta y siete por seis es doscientos ochenta y dos.'},
{type:'fill',q:'Calcula: 15 × 15 = ?',answer:'225',exp:'15×15 = 225. Quince al cuadrado es doscientos veinticinco.'},
{type:'mc',q:'Calcula: 32 × 9 = ?',options:['278','288','298','308'],answer:1,exp:'32×9 = 288. Treinta y dos por nueve es doscientos ochenta y ocho.'},
{type:'mc',q:'Calcula: 64 × 5 = ?',options:['300','310','320','330'],answer:2,exp:'64×5 = 320. Sesenta y cuatro por cinco es trescientos veinte.'},
{type:'fill',q:'Calcula: 7 × 13 = ?',answer:'91',exp:'7×13 = 91. Siete por trece es noventa y uno.'},
{type:'mc',q:'Calcula: 99 × 3 = ?',options:['277','287','297','307'],answer:2,exp:'99×3 = 297. Noventa y nueve por tres es doscientos noventa y siete.'},
{type:'fill',q:'Calcula: 18 × 6 = ?',answer:'108',exp:'18×6 = 108. Dieciocho por seis es ciento ocho.'}
]
},
{
title:'División de números naturales',
exercises:[
{type:'fill',q:'Calcula: 144 ÷ 12 = ?',answer:'12',exp:'144÷12 = 12. Doce por doce es ciento cuarenta y cuatro.'},
{type:'mc',q:'Calcula: 85 ÷ 5 = ?',options:['15','16','17','18'],answer:2,exp:'85÷5 = 17. Diecisiete por cinco es ochenta y cinco.'},
{type:'fill',q:'Calcula: 96 ÷ 8 = ?',answer:'12',exp:'96÷8 = 12. Doce por ocho es noventa y seis.'},
{type:'mc',q:'Calcula: 234 ÷ 6 = ?',options:['38','39','40','41'],answer:1,exp:'234÷6 = 39. Treinta y nueve por seis es doscientos treinta y cuatro.'},
{type:'fill',q:'Calcula: 100 ÷ 4 = ?',answer:'25',exp:'100÷4 = 25. Veinticinco por cuatro es cien.'},
{type:'mc',q:'Calcula: 377 ÷ 13 = ?',options:['27','28','29','30'],answer:2,exp:'377÷13 = 29. Veintinueve por trece es trescientos setenta y siete.'},
{type:'mc',q:'¿Cuál es el resto de 17 ÷ 5?',options:['1','2','3','4'],answer:1,exp:'17÷5 = 3 con resto 2. Porque 5×3=15 y 17-15=2.'},
{type:'fill',q:'Calcula: 200 ÷ 8 = ?',answer:'25',exp:'200÷8 = 25. Veinticinco por ocho es doscientos.'},
{type:'mc',q:'Calcula: 455 ÷ 7 = ?',options:['63','64','65','66'],answer:2,exp:'455÷7 = 65. Sesenta y cinco por siete es cuatrocientos cincuenta y cinco.'},
{type:'fill',q:'Calcula: 81 ÷ 9 = ?',answer:'9',exp:'81÷9 = 9. Nueve por nueve es ochenta y uno.'}
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
{type:'mc',q:'Calcula la media de: 4, 6, 8, 10',options:['6','7','8','9'],answer:1,exp:'Media = (4+6+8+10)÷4 = 28÷4 = 7'},
{type:'fill',q:'Calcula la media de: 3, 5, 7, 9',answer:'6',exp:'Media = (3+5+7+9)÷4 = 24÷4 = 6'},
{type:'mc',q:'¿Cuál es la moda de: 2, 3, 3, 5, 7?',options:['2','3','5','no hay'],answer:1,exp:'La moda es el valor que más se repite. El 3 aparece 2 veces.'},
{type:'mc',q:'¿Cuál es la mediana de: 3, 5, 7, 9, 11?',options:['5','7','9','8'],answer:1,exp:'La mediana es el valor central. Ordenados: 3,5,7,9,11 → el central es 7.'},
{type:'fill',q:'Calcula la media de: 10, 20, 30',answer:'20',exp:'Media = (10+20+30)÷3 = 60÷3 = 20'},
{type:'mc',q:'¿Cuál es la mediana de: 4, 8, 6, 2?',options:['4','5','6','7'],answer:1,exp:'Ordenados: 2,4,6,8 → mediana = (4+6)÷2 = 5 (par de datos, promedio de los dos centrales)'},
{type:'mc',q:'¿Cuál es la moda de: 5, 5, 5, 8, 9?',options:['5','8','9','no hay'],answer:0,exp:'La moda es 5, ya que aparece 3 veces (más que cualquier otro).'},
{type:'fill',q:'Calcula la media de: 6, 6, 6, 6',answer:'6',exp:'Media = (6+6+6+6)÷4 = 24÷4 = 6. Todos iguales, la media es ese valor.'},
{type:'mc',q:'¿Cuál es la mediana de: 1, 3, 5, 7, 9, 11?',options:['5','6','7','8'],answer:1,exp:'6 datos → mediana = (5+7)÷2 = 6 (promedio de los dos centrales)'},
{type:'mc',q:'¿Cuál es la moda de: 4, 7, 4, 9, 7, 4?',options:['4','7','9','4 y 7'],answer:0,exp:'El 4 aparece 3 veces y el 7 aparece 2 veces. La moda es 4.'}
]
},
{
title:'Tabla de frecuencia',
exercises:[
{type:'mc',q:'¿Qué es la frecuencia absoluta (fi)?',options:['El total de datos','Cuántas veces se repite un dato','El porcentaje','La suma acumulada'],answer:1,exp:'La frecuencia absoluta (fi) es el número de veces que se repite cada dato.'},
{type:'fill',q:'Si los datos son: 2,2,3,4,4,4,5, ¿cuál es la frecuencia absoluta de 4?',answer:'3',exp:'El 4 aparece 3 veces en los datos: 2,2,3,4,4,4,5'},
{type:'mc',q:'¿Qué es la frecuencia acumulada (Fi)?',options:['La suma de frecuencias anteriores','El dato más frecuente','El promedio','El porcentaje'],answer:0,exp:'La frecuencia acumulada (Fi) es la suma de las frecuencias absolutas hasta ese dato.'},
{type:'mc',q:'Si fi=3 y N=20, ¿cuál es la frecuencia relativa hi?',options:['0.10','0.15','0.20','0.30'],answer:1,exp:'hi = fi÷N = 3÷20 = 0.15'},
{type:'fill',q:'Si la suma de todas las frecuencias absolutas es 25, ¿cuánto vale N?',answer:'25',exp:'N es el total de datos, que es igual a la suma de todas las frecuencias absolutas.'},
{type:'mc',q:'Si fi=5 y N=25, ¿cuál es la frecuencia relativa hi?',options:['0.15','0.20','0.25','0.30'],answer:1,exp:'hi = fi÷N = 5÷25 = 0.20'},
{type:'mc',q:'Si hi=0.20, ¿cuál es el porcentaje?',options:['10%','15%','20%','25%'],answer:2,exp:'Porcentaje = hi×100 = 0.20×100 = 20%'},
{type:'fill',q:'Si los datos son: 1,1,1,2,3, ¿cuál es la frecuencia absoluta de 1?',answer:'3',exp:'El 1 aparece 3 veces: 1,1,1,2,3'},
{type:'mc',q:'En una tabla de frecuencia, ¿qué representa N?',options:['El número más grande','El total de datos','La moda','La media'],answer:1,exp:'N representa el número total de datos o la suma de todas las frecuencias absolutas.'},
{type:'mc',q:'Si fi=4 y N=40, ¿cuál es el porcentaje?',options:['5%','10%','15%','20%'],answer:1,exp:'hi = 4÷40 = 0.10 → Porcentaje = 0.10×100 = 10%'}
]
}
]
}
];
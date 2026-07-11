// Comunicacion Exercises Data - Colegio Rodrigo 6th Grade
var units=[
{
id:'c1',title:'Comunicación – Práctica General',color:'green',icon:'✍️',
topics:[
{
title:'El afiche',
exercises:[
{type:'mc',q:'¿Cuál es el propósito principal de un afiche?',options:['Entretener con cuentos','Informar o anunciar algo brevemente','Escribir una novela','Hacer una lista de compras'],answer:1,exp:'El afiche sirve para informar, anunciar o persuadir de forma breve y visual.'},
{type:'mc',q:'¿Cuál de estos elementos es ESENCIAL en un afiche?',options:['Un título llamativo','Un índice','Un glosario','Una bibliografía'],answer:0,exp:'El título debe ser llamativo y breve para captar la atención del público.'},
{type:'mc',q:'¿Qué tipo de lenguaje usa un afiche?',options:['Lenguaje largo y aburrido','Lenguaje breve, claro y persuasivo','Lenguaje técnico y complicado','Solo números'],answer:1,exp:'El afiche usa lenguaje breve, claro y persuasivo para comunicar rápido.'},
{type:'mc',q:'¿A qué se llama "público objetivo" en un afiche?',options:['A las personas que lo imprimen','A las personas a quienes va dirigido el mensaje','A los colores del afiche','Al tamaño del papel'],answer:1,exp:'El público objetivo son las personas a quienes va dirigido el mensaje del afiche.'},
{type:'fill',q:'Completa: Un afiche debe tener un título, imágenes y un texto ___.',answer:'breve',exp:'El texto del afiche debe ser breve para que se lea rápidamente.'},
{type:'mc',q:'¿Cuál NO es un elemento de un afiche?',options:['Título','Imagen o ilustración','Capítulos del libro','Mensaje o eslogan'],answer:2,exp:'Los capítulos pertenecen a un libro, no a un afiche.'},
{type:'mc',q:'¿Por qué un afiche usa colores llamativos?',options:['Para gastar tinta','Para captar la atención del público','Porque es obligatorio','Para que cueste más'],answer:1,exp:'Los colores llamativos ayudan a captar la atención del público rápidamente.'},
{type:'mc',q:'¿Qué es un eslogan en un afiche?',options:['Una lista de precios','Una frase corta y memorable','Un dibujo','El nombre del impresor'],answer:1,exp:'Un eslogan es una frase corta, memorable y persuasiva que resume el mensaje.'},
{type:'mc',q:'¿Dónde es común ver afiches?',options:['Dentro de un sobre','En paredes, colegios y paradas de bus','En un diccionario','En un testamento'],answer:1,exp:'Los afiches se colocan en lugares visibles donde mucha gente pueda verlos.'},
{type:'mc',q:'Un afiche sobre vacunación tiene como propósito:',options:['Vender ropa','Informar y concientizar a la gente','Contar un chiste','Hacer una receta'],answer:1,exp:'Un afiche de vacunación busca informar y concientizar sobre la importancia de vacunarse.'}
]
},
{
title:'Familia de palabras',
exercises:[
{type:'mc',q:'¿Qué es una familia de palabras?',options:['Palabras que riman','Palabras que comparten la misma raíz o lexema','Palabras sinónimas','Palabras extranjeras'],answer:1,exp:'Una familia de palabras comparten el mismo lexema o raíz. Ej: pan, panadero, panadería.'},
{type:'mc',q:'¿Cuál pertenece a la familia de "flor"?',options:['flotar','florista','florear','fluvial'],answer:1,exp:'Florista comparte el lexema "flor" con flor, floral, florecer.'},
{type:'mc',q:'¿Cuál NO pertenece a la familia de "pan"?',options:['panadería','panecillo','pantalla','panadero'],answer:2,exp:'Pantalla no comparte el lexema "pan" como raíz de significado.'},
{type:'fill',q:'Escribe una palabra de la familia de "mar": ___ero',answer:'mar',exp:'Marero, marino, marítimo comparten el lexema "mar".'},
{type:'mc',q:'¿Cuál pertenece a la familia de "libro"?',options:['librero','libre','línea','libertad'],answer:0,exp:'Librero, librería, libraco comparten el lexema "libr".'},
{type:'mc',q:'La familia de "jardín" incluye:',options:['jardinería','jade','jarrón','jarabe'],answer:0,exp:'Jardinería, jardinero comparten el lexema "jardín".'},
{type:'mc',q:'¿Cuál pertenece a la familia de "agua"?',options:['aguafiestas','aguanieve','ambos','aguja'],answer:1,exp:'Aguanieve, aguacero comparten el lexema "agua".'},
{type:'mc',q:'¿Qué palabra pertenece a la familia de "belleza"?',options:['bello','bellechar','embellecer','ambos A y C'],answer:3,exp:'Bello, embellecer, bellamente comparten el lexema "bell".'},
{type:'fill',q:'Completa con una palabra de la familia de "ferro" (hierro): ___vía',answer:'ferro',exp:'Ferrovía, ferrocarril comparten el lexema "ferro".'},
{type:'mc',q:'¿Cuál NO pertenece a la familia de "casa"?',options:['casero','caserío','casco','casita'],answer:2,exp:'Casco tiene "cas" pero su significado no deriva de "casa" como hogar.'}
]
},
{
title:'Uso de la coma',
exercises:[
{type:'mc',q:'¿Para qué se usa la coma en una enumeración?',options:['Para separar los elementos de una lista','Para terminar una oración','Para hacer una pregunta','Para indicar sorpresa'],answer:0,exp:'La coma separa los elementos de una lista: "Compré pan, leche, huevos y azúcar."'},
{type:'fill',q:'Coloca la coma: "Me gustan el fútbol ___ el básquet y el vóley."',answer:',',exp:'Se usa coma para separar elementos de una enumeración.'},
{type:'mc',q:'En "María, ven aquí." la coma se usa para:',options:['Separar una enumeración','Separar el vocativo (nombre de la persona)','Indicar una pausa larga','Cerrar la oración'],answer:1,exp:'La coma separa el vocativo del resto de la oración.'},
{type:'mc',q:'¿Cuál oración tiene la coma usada CORRECTAMENTE?',options:['Fui al parque, al cine y al zoo.','Fui, al parque al cine y al zoo.','Fui al parque al cine, y al zoo.','Fui al parque al cine y al zoo,'],answer:0,exp:'La coma separa los elementos de una enumeración: "Fui al parque, al cine y al zoo."'},
{type:'mc',q:'¿Cuándo se usa coma antes de una conjunción?',options:['Nunca','Cuando la conjunción une los dos últimos elementos de una lista','Siempre antes de "y"','Solo en preguntas'],answer:1,exp:'No se pone coma antes de "y" cuando une los últimos elementos de una lista simple.'},
{type:'mc',q:'¿Cuál oración es correcta?',options:['Compré manzanas, peras, y plátanos.','Compré manzanas, peras y plátanos.','Compré manzanas peras, y plátanos.','Compré, manzanas peras y plátanos.'],answer:1,exp:'En una lista simple no se pone coma antes de "y": "manzanas, peras y plátanos."'},
{type:'mc',q:'La coma en "En verano, vamos a la playa." se usa para:',options:['Separar vocativo','Separar una expresión inicial del resto','Enumerar','Indicar pregunta'],answer:1,exp:'Se usa coma para separar una expresión o complemento inicial del resto de la oración.'},
{type:'fill',q:'¿Qué signo falta? "Lima ___ la capital del Perú, es grande."',answer:',',exp:'Se usa coma para separar una aclaración o explicación dentro de la oración.'},
{type:'mc',q:'¿Es correcta esta oración? "Mi perro, ladra mucho."',options:['Sí, siempre','No, la coma separa innecesariamente al sujeto del verbo','Sí, porque es una pausa','No, falta punto'],answer:1,exp:'No se debe separar el sujeto del verbo con una coma.'},
{type:'mc',q:'En "Sí, quiero ir." la coma se usa para:',options:['Separar enumeración','Separar "sí" (afirmación) del resto','Separar vocativo','Indicar pregunta'],answer:1,exp:'Se usa coma después de "sí" o "no" cuando responden a una pregunta.'}
]
},
{
title:'Figuras literarias',
exercises:[
{type:'mc',q:'¿Qué es un símil (comparación)?',options:['Una comparación usando "como" o "cual"','Una exageración','Dar cualidades humanas a objetos','Repetir sonidos'],answer:0,exp:'El símil compara dos cosas usando "como", "cual", "tan" o "parece".'},
{type:'mc',q:'"Sus ojos son como estrellas." ¿Qué figura literaria es?',options:['Metáfora','Símil','Personificación','Hipérbole'],answer:1,exp:'Es un símil porque usa "como" para comparar los ojos con estrellas.'},
{type:'mc',q:'¿Qué es una metáfora?',options:['Una comparación con "como"','Identificar un objeto con otro sin "como"','Una exageración','Repetir palabras'],answer:1,exp:'La metáfora identifica un objeto con otro directamente, sin usar "como" o "cual".'},
{type:'mc',q:'"Sus ojos son estrellas." ¿Qué figura literaria es?',options:['Símil','Metáfora','Personificación','Aliteración'],answer:1,exp:'Es una metáfora porque identifica los ojos con estrellas directamente, sin "como".'},
{type:'mc',q:'"El viento susurra entre los árboles." ¿Qué figura es?',options:['Metáfora','Símil','Personificación','Hipérbole'],answer:2,exp:'Es personificación porque le da cualidades humanas (susurrar) al viento.'},
{type:'mc',q:'¿Qué es la personificación?',options:['Comparar con "como"','Dar cualidades humanas a cosas no humanas','Exagerar mucho','Repetir sonidos'],answer:1,exp:'La personificación da cualidades o acciones humanas a objetos, animales o fenómenos.'},
{type:'mc',q:'"Tengo un millón de cosas que hacer." ¿Qué figura es?',options:['Símil','Metáfora','Hipérbole','Personificación'],answer:2,exp:'Es una hipérbole: una exageración extrema para dar énfasis.'},
{type:'mc',q:'¿Qué es la hipérbole?',options:['Una comparación','Una exageración extrema','Dar vida a objetos','Repetir sonidos'],answer:1,exp:'La hipérbole es una exageración exagerada que no se toma literalmente.'},
{type:'mc',q:'"El perro peleó con el gato." ¿Qué figura es si el perro y gato hablan?',options:['Símil','Personificación','Metáfora','Hipérbole'],answer:1,exp:'Si los animales hablan, es personificación: se les da cualidades humanas.'},
{type:'mc',q:'"La luna sonríe en el cielo." ¿Qué figura literaria es?',options:['Símil','Metáfora','Personificación','Hipérbole'],answer:2,exp:'Es personificación: la luna no puede sonreír, se le da una cualidad humana.'}
]
},
{
title:'Uso del punto y coma',
exercises:[
{type:'mc',q:'¿Para qué se usa el punto y coma (;)?',options:['Para terminar una oración','Para separar elementos largos de una lista o ideas relacionadas','Para hacer una pregunta','Para empezar un texto'],answer:1,exp:'El punto y coma separa elementos largos de una enumeración o ideas relacionadas que ya tienen comas.'},
{type:'mc',q:'¿Cuál oración usa el punto y coma CORRECTAMENTE?',options:['Me gustan los perros; los gatos; y los pájaros.','Me gustan los perros, los gatos; y los pájaros.','Me gustan los perros; los gatos y los pájaros.','Me gustan los perros los gatos; y los pájaros.'],answer:2,exp:'El punto y coma separa elementos de una lista cuando estos ya contienen comas.'},
{type:'mc',q:'En una lista compleja, ¿cuándo se prefiere ; en vez de , ?',options:['Cuando los elementos son muy cortos','Cuando los elementos son largos o ya contienen comas','Nunca','Siempre'],answer:1,exp:'Se usa punto y coma cuando los elementos son largos o ya contienen comas internas.'},
{type:'mc',q:'"En Lima, Perú; Bogotá, Colombia; y Quito, Ecuador." ¿Por qué se usa ; ?',options:['Porque las ciudades tienen comas internas (país)','Por error','Porque es una pregunta','No debería usarse'],answer:0,exp:'Cada elemento ya tiene una coma (ciudad, país), así que se separan con punto y coma.'},
{type:'mc',q:'El punto y coma es "más fuerte" que...',options:['El punto final','La coma','El signo de exclamación','Los dos puntos'],answer:1,exp:'El punto y coma separa más que la coma pero menos que el punto.'},
{type:'mc',q:'¿Cuál es correcta?',options:['Fui al parque; jugué; y volví.','Fui al parque, jugué y volví.','Fui al parque jugué; y volví.','Fui; al parque, jugué y volví.'],answer:1,exp:'En una lista simple y corta, se usa coma, no punto y coma.'},
{type:'mc',q:'"Los niños jugaban; las niñas conversaban." El ; separa:',options:['Dos elementos de una lista','Dos oraciones relacionadas sin conjunción','Un vocativo','Una pregunta'],answer:1,exp:'El punto y coma puede separar dos oraciones relacionadas que no van unidas por conjunción.'},
{type:'mc',q:'¿Se puede usar ; antes de una conjunción como "pero"?',options:['No, nunca','Sí, cuando las oraciones son largas','Solo en preguntas','Solo en versos'],answer:1,exp:'Se puede usar punto y coma antes de "pero", "aunque" etc. cuando las oraciones son largas.'},
{type:'fill',q:'¿Qué signo falta? "Vivo en Lima, Perú ___ mi primo vive en Quito, Ecuador."',answer:';',exp:'Se usa punto y coma para separar dos oraciones largas relacionadas que ya tienen comas.'},
{type:'mc',q:'¿Cuál NO es un uso correcto del punto y coma?',options:['Separar elementos largos de una lista','Separar dos oraciones relacionadas','Separar el sujeto del predicado','Separar elementos que ya tienen comas'],answer:2,exp:'Nunca se usa punto y coma para separar el sujeto del predicado.'}
]
},
{
title:'Sujeto - análisis de oración (modificadores)',
exercises:[
{type:'mc',q:'¿Qué es el sujeto de una oración?',options:['La acción que se realiza','De quien se habla o quien realiza la acción','El verbo','El complemento'],answer:1,exp:'El sujeto es de quien se habla o quien realiza la acción en la oración.'},
{type:'mc',q:'En "El perro ladra", ¿cuál es el sujeto?',options:['ladra','El perro','El','perro ladra'],answer:1,exp:'El sujeto es "El perro", de quien se habla en la oración.'},
{type:'mc',q:'¿Qué es un modificador directo (MD)?',options:['Un adjetivo o artículo que acompaña al sustantivo','Un verbo','Un adverbio','El predicado'],answer:0,exp:'El MD es un artículo o adjetivo que modifica directamente al sustantivo del sujeto.'},
{type:'mc',q:'En "El gato negro duerme", ¿cuál es el MD del sujeto?',options:['duerme','negro','El gato negro','El y negro'],answer:3,exp:'"El" (artículo) y "negro" (adjetivo) son modificadores directos del sustantivo "gato".'},
{type:'mc',q:'¿Qué es un modificador indirecto (MI)?',options:['Un adjetivo','Una construcción encabezada por preposición','El verbo','El sustantivo'],answer:1,exp:'El MI es una construcción con preposición que modifica al sustantivo. Ej: "de mi hermana".'},
{type:'mc',q:'En "La casa de mi tía es grande", ¿cuál es el MI?',options:['es grande','La','de mi tía','casa'],answer:2,exp:'"de mi tía" es un modificador indirecto porque va encabezado por la preposición "de".'},
{type:'mc',q:'En "El libro de ciencias es interesante", el sujeto es:',options:['El libro','El libro de ciencias','es interesante','de ciencias'],answer:1,exp:'El sujeto completo es "El libro de ciencias". El núcleo es "libro".'},
{type:'mc',q:'¿Qué es la aposición (Apo)?',options:['Un adjetivo','Un sustantivo que explica a otro sustantivo','Un verbo','Una preposición'],answer:1,exp:'La aposición es un sustantivo que explica o aclara a otro sustantivo. Ej: "Lima, la capital,..."'},
{type:'mc',q:'En "Mi amigo, el doctor, vino hoy", "el doctor" es:',options:['MD','MI','Aposición (Apo)','Verbo'],answer:2,exp:'"El doctor" es una aposición: un sustantivo que explica a "mi amigo".'},
{type:'mc',q:'En "Los niños felices juegan", el núcleo del sujeto es:',options:['Los','felices','niños','juegan'],answer:2,exp:'El núcleo del sujeto es el sustantivo principal: "niños". "Los" y "felices" son MD.'}
]
}
]
}
];

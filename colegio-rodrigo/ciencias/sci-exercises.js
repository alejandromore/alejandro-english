// Science Exercises Data - Colegio Rodrigo 6th Grade
var units=[
{
id:'s3',title:'Unit 3 – Cells and Life Cycles',color:'blue',icon:'🔬',
topics:[
{
title:'Animal Cell vs Plant Cell',
exercises:[
{type:'mc',q:'Which part is found in a PLANT cell but NOT in an animal cell?',options:['Cell membrane','Cell wall','Nucleus','Mitochondria'],answer:1,exp:'The cell wall is found only in plant cells. It gives the plant cell a rigid shape.'},
{type:'mc',q:'Which part is found in a PLANT cell but NOT in an animal cell?',options:['Cytoplasm','Chloroplast','Nucleus','Vacuole'],answer:1,exp:'Chloroplasts are found only in plant cells. They contain chlorophyll for photosynthesis.'},
{type:'mc',q:'What is the control center of the cell?',options:['Cell membrane','Cytoplasm','Nucleus','Vacuole'],answer:2,exp:'The nucleus is the control center. It contains DNA and controls all cell activities.'},
{type:'mc',q:'Which part stores water and nutrients in the cell?',options:['Nucleus','Vacuole','Mitochondria','Cell wall'],answer:1,exp:'The vacuole stores water, nutrients, and waste. Plant cells have a large central vacuole.'},
{type:'mc',q:'Where does photosynthesis happen in a plant cell?',options:['Mitochondria','Nucleus','Chloroplast','Vacuole'],answer:2,exp:'Photosynthesis happens in the chloroplasts, which contain chlorophyll.'},
{type:'mc',q:'Which part produces energy for the cell?',options:['Nucleus','Mitochondria','Cell membrane','Vacuole'],answer:1,exp:'Mitochondria are the "powerhouse" of the cell. They produce energy through respiration.'},
{type:'mc',q:'What is the jelly-like substance inside the cell?',options:['Cell wall','Cytoplasm','Nucleus','Chloroplast'],answer:1,exp:'Cytoplasm is the jelly-like substance where all cell organelles are suspended.'},
{type:'mc',q:'Which part controls what enters and leaves the cell?',options:['Cell wall','Nucleus','Cell membrane','Vacuole'],answer:2,exp:'The cell membrane controls what enters and leaves the cell. It is selectively permeable.'},
{type:'mc',q:'Do animal cells have a cell wall?',options:['Yes, always','No, never','Only some animal cells','Only in water'],answer:1,exp:'Animal cells do NOT have a cell wall. Only plant cells, fungi, and bacteria have cell walls.'},
{type:'mc',q:'Which is NOT a difference between plant and animal cells?',options:['Plant cells have chloroplasts','Plant cells have a cell wall','Both have a nucleus','Animal cells have a cell wall'],answer:2,exp:'Both plant and animal cells have a nucleus. This is a similarity, not a difference.'}
]
},
{
title:'Science Lab',
exercises:[
{type:'mc',q:'What should you wear to protect your eyes in the lab?',options:['Gloves','Safety goggles','Hat','Sunglasses'],answer:1,exp:'Safety goggles protect your eyes from chemicals and broken glass.'},
{type:'mc',q:'What should you do if a chemical spills on your skin?',options:['Ignore it','Wash with plenty of water','Cover it with a bandage','Put cream on it'],answer:1,exp:'Wash immediately with plenty of water and tell the teacher right away!'},
{type:'mc',q:'Which is NOT a lab safety rule?',options:['Never eat or drink in the lab','Always wear safety goggles','Run in the lab to save time','Tell the teacher about accidents'],answer:2,exp:'Never run in the lab! You could knock over equipment or chemicals.'},
{type:'mc',q:'What do you use to heat liquids in the lab?',options:['Beaker','Bunsen burner','Test tube rack','Funnel'],answer:1,exp:'A Bunsen burner is used to heat substances in the lab.'},
{type:'mc',q:'What instrument do you use to see very small things like cells?',options:['Telescope','Hand lens','Microscope','Binoculars'],answer:2,exp:'A microscope is used to see very small things like cells and microorganisms.'},
{type:'mc',q:'What should you do before starting a lab experiment?',options:['Skip the instructions','Read all instructions carefully','Start immediately','Ask a friend what to do'],answer:1,exp:'Always read all instructions carefully before starting any experiment.'},
{type:'mc',q:'What is a beaker used for?',options:['To measure temperature','To hold and mix liquids','To cut things','To weigh objects'],answer:1,exp:'A beaker is used to hold, mix, and heat liquids.'},
{type:'mc',q:'What should you do with broken glass?',options:['Pick it up with bare hands','Tell the teacher immediately','Sweep it under the table','Throw it in the normal trash'],answer:1,exp:'Tell the teacher immediately. Broken glass must be cleaned up safely.'},
{type:'mc',q:'What do you use to measure the volume of a liquid?',options:['Ruler','Thermometer','Measuring cylinder','Balance'],answer:2,exp:'A measuring cylinder (or graduated cylinder) measures the volume of liquids.'},
{type:'mc',q:'Why do we tie back long hair in the lab?',options:['To look neat','It could catch fire or get in chemicals','It is a fashion rule','To see better'],answer:1,exp:'Long hair could catch fire or get into chemicals. Always tie it back!'}
]
},
{
title:'Life Stages',
exercises:[
{type:'mc',q:'What is the first stage of a butterfly\'s life cycle?',options:['Butterfly','Caterpillar','Egg','Chrysalis'],answer:2,exp:'The life cycle starts with an egg. Then: egg → caterpillar → chrysalis → butterfly.'},
{type:'mc',q:'What does a caterpillar turn into before becoming a butterfly?',options:['Egg','Chrysalis (pupa)','Adult butterfly','Another caterpillar'],answer:1,exp:'The caterpillar forms a chrysalis (pupa) before transforming into a butterfly.'},
{type:'mc',q:'What is the correct order of a frog\'s life cycle?',options:['Frog → Tadpole → Egg','Egg → Tadpole → Frog','Tadpole → Egg → Frog','Egg → Frog → Tadpole'],answer:1,exp:'Frog life cycle: Egg → Tadpole → Froglet → Adult Frog.'},
{type:'mc',q:'What do we call a young frog that still has a tail?',options:['Tadpole','Froglet','Adult frog','Egg'],answer:0,exp:'A tadpole is the young stage of a frog. It lives in water and has a tail.'},
{type:'mc',q:'What is metamorphosis?',options:['A type of food','A change in body form during life cycle','A disease','A type of habitat'],answer:1,exp:'Metamorphosis is a big change in body form during an animal\'s life cycle.'},
{type:'mc',q:'Which animal undergoes COMPLETE metamorphosis?',options:['Frog','Butterfly','Fish','Snake'],answer:1,exp:'Butterflies undergo complete metamorphosis: egg → larva → pupa → adult.'},
{type:'mc',q:'What do baby mammals drink from their mother?',options:['Water','Milk','Juice','Solid food'],answer:1,exp:'Baby mammals drink milk from their mother. This is a characteristic of mammals.'},
{type:'mc',q:'What is the last stage of any life cycle called?',options:['Baby stage','Adult stage','Egg stage','Young stage'],answer:1,exp:'The adult stage is the last stage. Adults can reproduce and start the cycle again.'},
{type:'mc',q:'What does a seed need to germinate?',options:['Only water','Water, warmth, and air','Only sunlight','Only soil'],answer:1,exp:'Seeds need water, warmth (temperature), and air (oxygen) to germinate.'},
{type:'mc',q:'What is the correct order of a plant\'s life cycle?',options:['Flower → Seed → Plant','Seed → Plant → Flower → Seed','Plant → Seed → Flower','Seed → Flower → Plant'],answer:1,exp:'Plant life cycle: Seed → Plant → Flower → Seed (the cycle repeats).'}
]
}
]
},
{
id:'s4',title:'Unit 4 – Reproduction in Living Organisms',color:'orange',icon:'🧬',
topics:[
{
title:'Human Reproductive System',
exercises:[
{type:'mc',q:'What is the male reproductive cell called?',options:['Egg cell','Sperm cell','Blood cell','Nerve cell'],answer:1,exp:'The sperm cell is the male reproductive cell. It is very small and can swim.'},
{type:'mc',q:'What is the female reproductive cell called?',options:['Sperm cell','Egg cell (ovum)','Skin cell','Muscle cell'],answer:1,exp:'The egg cell (ovum) is the female reproductive cell. It is much larger than a sperm cell.'},
{type:'mc',q:'Where are egg cells produced?',options:['In the testes','In the ovaries','In the uterus','In the stomach'],answer:1,exp:'Egg cells are produced in the ovaries, which are part of the female reproductive system.'},
{type:'mc',q:'Where are sperm cells produced?',options:['In the ovaries','In the testes','In the uterus','In the brain'],answer:1,exp:'Sperm cells are produced in the testes, which are part of the male reproductive system.'},
{type:'mc',q:'Where does a baby develop during pregnancy?',options:['In the ovaries','In the uterus (womb)','In the stomach','In the lungs'],answer:1,exp:'A baby develops in the uterus (womb) during the approximately 9 months of pregnancy.'},
{type:'mc',q:'What is fertilization?',options:['When a baby is born','When a sperm joins with an egg','When an egg is produced','When a baby feeds'],answer:1,exp:'Fertilization is when a sperm cell joins with an egg cell to form a new cell called a zygote.'},
{type:'mc',q:'How long does a human pregnancy last?',options:['3 months','6 months','About 9 months','12 months'],answer:2,exp:'A human pregnancy lasts about 9 months (approximately 40 weeks).'},
{type:'mc',q:'What is the placenta?',options:['An organ that feeds the baby','A type of cell','A muscle','A bone'],answer:0,exp:'The placenta is an organ that provides oxygen and nutrients to the developing baby.'},
{type:'mc',q:'What is the umbilical cord?',options:['A bone in the leg','A tube connecting baby to placenta','A type of muscle','A nerve'],answer:1,exp:'The umbilical cord connects the baby to the placenta, carrying oxygen and nutrients.'},
{type:'mc',q:'What do we call the changes that happen during puberty?',options:['Secondary sexual characteristics','Primary colors','Life stages','Metamorphosis'],answer:0,exp:'Puberty causes secondary sexual characteristics like growth of body hair and voice changes.'}
]
},
{
title:'Ecosystems',
exercises:[
{type:'mc',q:'What is an ecosystem?',options:['Only the plants in an area','All living and non-living things in an area','Only the animals in an area','Only the water in an area'],answer:1,exp:'An ecosystem includes all living things (plants, animals, microbes) and non-living things (water, soil, air) in an area.'},
{type:'mc',q:'What is a producer in an ecosystem?',options:['An animal that eats plants','A plant that makes its own food','A fungus','A bacteria'],answer:1,exp:'Producers are plants that make their own food through photosynthesis.'},
{type:'mc',q:'What is a consumer in an ecosystem?',options:['A plant','An animal that eats other organisms','The sun','Water'],answer:1,exp:'Consumers are animals that eat other organisms. They cannot make their own food.'},
{type:'mc',q:'What is a decomposer?',options:['A plant that eats animals','An organism that breaks down dead matter','A type of consumer','A producer'],answer:1,exp:'Decomposers (like fungi and bacteria) break down dead organisms and return nutrients to the soil.'},
{type:'mc',q:'What is a food chain?',options:['A list of foods we eat','A path showing who eats whom','A restaurant menu','A type of ecosystem'],answer:1,exp:'A food chain shows the flow of energy from one organism to another: who eats whom.'},
{type:'mc',q:'In a food chain, what comes first?',options:['Consumer','Producer (plant)','Decomposer','Sun'],answer:1,exp:'A food chain starts with a producer (plant), then consumers. The sun provides energy to the producer.'},
{type:'mc',q:'What is a predator?',options:['An animal that is eaten','An animal that hunts other animals','A plant','A decomposer'],answer:1,exp:'A predator is an animal that hunts and eats other animals (prey).'},
{type:'mc',q:'What is prey?',options:['An animal that hunts','An animal that is hunted and eaten','A plant','A decomposer'],answer:1,exp:'Prey is an animal that is hunted and eaten by a predator.'},
{type:'mc',q:'What happens if a producer is removed from a food chain?',options:['Nothing happens','The whole chain can collapse','Only the decomposers die','The predators grow more'],answer:1,exp:'If producers are removed, the consumers that depend on them will die, and the whole food chain can collapse.'},
{type:'mc',q:'What is biodiversity?',options:['The number of plants only','The variety of living things in an ecosystem','The size of an ecosystem','The number of animals only'],answer:1,exp:'Biodiversity is the variety of all living things (plants, animals, microbes) in an ecosystem. Higher biodiversity means a healthier ecosystem.'}
]
},
{
title:'Sexual and Asexual Reproduction',
exercises:[
{type:'mc',q:'What is sexual reproduction?',options:['Reproduction with one parent only','Reproduction with two parents (male and female)','Reproduction without cells','Reproduction by splitting'],answer:1,exp:'Sexual reproduction involves two parents. A sperm cell and an egg cell join together (fertilization).'},
{type:'mc',q:'What is asexual reproduction?',options:['Reproduction with two parents','Reproduction with only one parent','Reproduction with three parents','No reproduction'],answer:1,exp:'Asexual reproduction involves only one parent. The offspring are identical copies of the parent.'},
{type:'mc',q:'Which organism reproduces asexually?',options:['Humans','Bacteria','Dogs','Birds'],answer:1,exp:'Bacteria reproduce asexually by splitting into two (binary fission).'},
{type:'mc',q:'Which is an example of asexual reproduction in plants?',options:['A seed growing after pollination','A plant growing from a cutting','A flower being pollinated','A fruit forming after fertilization'],answer:1,exp:'Growing a plant from a cutting is asexual reproduction. The new plant is identical to the parent.'},
{type:'mc',q:'What is binary fission?',options:['When a cell splits into two','When two cells join together','When a cell grows larger','When a cell dies'],answer:0,exp:'Binary fission is when a single cell splits into two identical cells. Bacteria reproduce this way.'},
{type:'mc',q:'What is budding?',options:['When two parents produce offspring','When a new organism grows out of the parent','When a cell splits in two','When seeds are formed'],answer:1,exp:'Budding is when a new organism grows out of the parent\'s body. Yeast and hydra reproduce this way.'},
{type:'mc',q:'What is an advantage of sexual reproduction?',options:['It is very fast','Offspring have genetic variation','Only one parent is needed','Offspring are identical to parent'],answer:1,exp:'Sexual reproduction creates genetic variation, which helps species adapt to changes in the environment.'},
{type:'mc',q:'What is an advantage of asexual reproduction?',options:['Offspring have genetic variation','It is fast and only needs one parent','It requires two parents','It takes a long time'],answer:1,exp:'Asexual reproduction is fast and only requires one parent. However, there is no genetic variation.'},
{type:'mc',q:'Which animal can reproduce BOTH sexually and asexually?',options:['Human','Starfish','Dog','Cat'],answer:1,exp:'Some starfish can reproduce asexually by regeneration (growing from a broken arm) and also sexually.'},
{type:'mc',q:'In sexual reproduction, what forms when sperm and egg join?',options:['A sperm','An egg','A zygote','A bacteria'],answer:2,exp:'When a sperm and egg join (fertilization), they form a zygote, which develops into a new organism.'}
]
}
]
}
];

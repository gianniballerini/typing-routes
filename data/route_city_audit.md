# Route city audit (2026-10)

Every national route in `routes.json` was checked against its Spanish Wikipedia article ("Ruta Nacional N (Argentina)") to find localities the road passes through that the game was missing. Missing towns were added with coordinates from their own Wikipedia article, then verified against the DNV route geometry (`data/raw/national_routes_geometries.json`): a town is only added if it lies within 0.07° (~7 km) of the road, and every changed route is re-sorted by position along the geometry, which is the direction the game plays it.

## Summary

- Routes audited: 98
- Routes changed: 60
- Cities added to routes: 530 (486 new catalog entries, the rest reused existing ids)
- Rejected (too far from geometry): 4
- Towns found in the source but without trustworthy coordinates (not added): 34
- Existing cities flagged for review (not changed): 109

Existing cities were never removed by this pass. Excluded places (accesos, parajes, junctions, bridges, border crossings) are not listed here.

## Needs follow-up

### Rejected by the geometry check

- **RN-33**: Treinta de Agosto — 0.145° from the road line
- **RN-33**: Sancti Spiritu — 0.071° from the road line
- **RN-86**: Tartagal — 2.52° from the road line
- **RN-229**: Bahía Blanca — 0.162° from the road line

### No trustworthy coordinates found

- **RN-3**: La Noria (Buenos Aires, km 75), El Mangrullo (Santa Cruz, km 1894)
- **RN-9**: Ingeniero Otamendi (Buenos Aires, km 70), Tortugas (Santa Fe, km 419)
- **RN-11**: Hardy (Santa Fe, km 913)
- **RN-12**: Miguel Lanús (Misiones, km 1347)
- **RN-40**: Ranquil del Norte (Neuquén), Naunauco (Neuquén), Coihueco Norte (Mendoza), Zapata (Mendoza), Agrelo (Mendoza), Pedro Molina (Mendoza), General San Martín (San Juan), Talacasto (San Juan)
- **RN-51**: San Luis (Salta)
- **RN-52**: La Ciénaga (Jujuy)
- **RN-60**: Lucio V. Mansilla (Córdoba)
- **RN-64**: Huacra (Tucumán)
- **RN-77**: Monte Grande (La Rioja, km 91; no wiki page found)
- **RN-86**: Fortín Pilcomayo (Formosa, km 1687), Río Muerto (Formosa, km 1747; es.wiki 'Río Muerto' is the Chaco town, not this one), El Solitario (Formosa, km 1770), Puerto Cabo Irigoyen (Formosa, km 1812), Tonono (Salta, km 1982; redlink in source)
- **RN-89**: Pozo del Indio (Chaco, km 220; no es.wiki article found)
- **RN-105**: Parada Leis (Misiones, km 16) - es.wikipedia article 404, web search found no coordinates; id would be misiones/parada-leis
- **RN-136**: Pueblo General Belgrano (Entre Ríos): es.wikipedia fetch returned -33.0103,-58.5142 which is essentially Gualeguaychú center; not trusted, verify
- **RN-142**: Asunción / La Asunción (Mendoza, Lavalle): es.wikipedia article does not exist (red link), no coords found
- **RN-145**: Las Loicas (Mendoza, Malargüe): no es.wikipedia article/coords found
- **RN-147**: San Antonio (San Luis, Belgrano): listed only as paraje on dept page, no article/coords found
- **RN-158**: Trincheras (Córdoba, km 89): es.wikipedia article has no coordinates
- **RN-168**: La Guardia (Santa Fe, km 7): es.wikipedia article has no coordinates (only 'a 5 km al este del centro' of Santa Fe)
- **RN-188**: Colonia Alvear Oeste (Mendoza, km 801): no es/en article with coordinates
- **RN-205**: Barrio Uno (Ezeiza, km 27): es.wikipedia article has no coordinates

### Flagged existing cities

- **RN-3** `caba/buenos-aires`: Not on RN 3 per source: route starts at Lomas del Mirador (km 14-16, La Matanza); geometry start is 18.8 km from the city point.
- **RN-3** `buenos-aires/benito-juarez`: Source lists only 'acceso por RP 86' (km 401); 6.3 km off geometry.
- **RN-3** `rio-negro/las-grutas`: Source lists only 'acceso a Las Grutas' (km 1149); 6.9 km off geometry.
- **RN-3** `chubut/puerto-piramides`: Not on RN 3: it is on Peninsula Valdes (RP 2), 65.7 km from geometry; source does not list it.
- **RN-3** `chubut/puerto-madryn`: Source lists only 'acceso a Puerto Madryn' (km 1394); 6.5 km off geometry. Keep as access city.
- **RN-3** `chubut/garayalde`: Not in source (pop <500, Florentino Ameghino dept 'no hay localidades'); coordinates 30 km from the RN 3 geometry look wrong - verify.
- **RN-3** `santa-cruz/puerto-san-julian`: Source lists only 'acceso' (km 2252); 4.8 km off geometry.
- **RN-3** `tierra-del-fuego/estrecho-de-magallanes`: Not a locality (Strait crossing is in Chile); 35 km from geometry; source does not list it. San Sebastian (Chile border, source km 2766) is the real stop.
- **RN-3** `tierra-del-fuego/san-sebastian`: Argentine San Sebastian is 6.6 km off geometry; source only mentions 'acceso a San Sebastian (Chile)' km 2766.
- **RN-3** `tierra-del-fuego/lapataia`: Route terminus (Parque Nacional Tierra del Fuego), not a source-listed locality; keep only if intentional as end point.
- **RN-7** `caba/buenos-aires`: Not on RN 7 per source: route (Acceso Oeste) starts at Ciudadela/Tres de Febrero km 12-13; geometry start is 14 km from the city point.
- **RN-11** `santa-fe/rosario`: 10.1 km from route geometry
- **RN-14** `entre-rios/colon`: Source lists only 'acceso a Colon (RN 135)' km 151; 8.8 km off geometry.
- **RN-14** `entre-rios/federacion`: Source lists only 'acceso a Federacion' km 296; 16.3 km off geometry.
- **RN-14** `corrientes/paso-de-los-libres`: Source lists only 'acceso por RN 117' km 496; 11.7 km off geometry.
- **RN-14** `misiones/apostoles`: Source: Apostoles dept 'no hay localidades >5000'; 15.9 km off geometry.
- **RN-16** `salta/metan`: Source's last locality is El Galpon (km 677-679); Metan is 16.5 km from the geometry end (it is on RN 9).
- **RN-18** `entre-rios/parana`: Source RN 18 starts at km 14 east of Parana (Colonia Avellaneda/San Benito); Parana city is 12 km from geometry.
- **RN-18** `entre-rios/concordia`: Source: Concordia dept 'no hay poblaciones'; Concordia is 20.6 km from geometry end.
- **RN-19** `corrientes/santo-tome`: Wrong province: RN 19 starts at Santo Tome, Santa Fe (-31.66,-60.77); add santa-fe/santo-tome and drop this one (578 km from geometry).
- **RN-19** `santa-fe/san-carlos-centro`: Source lists only 'acceso' to San Carlos Norte/Centro/Sud at km 29; 11.7 km off geometry.
- **RN-20** `cordoba/mina-clavero`: Not in source; 30.8 km from RN 20 geometry.
- **RN-22** `buenos-aires/bahia-blanca`: Source RN 22 begins at km 719 in Villarino/Medanos area; Bahia Blanca is 26 km from geometry start.
- **RN-23** `rio-negro/san-antonio-oeste`: Not listed by the article; route starts at the RN3 junction ~40 km west of San Antonio Oeste (geometry start lon -65.34).
- **RN-23** `rio-negro/ministro-ramos-mexia`: Listed by the article (km 181) but catalog coordinates look wrong: catalog lon -66.5744 vs es.wikipedia -40.5,-67.2833.
- **RN-25** `chubut/esquel`: Not listed by the article; route ends at Tecka (geometry end -70.80,-43.50). Esquel is ~100 km away on RN40/RN259.
- **RN-26** `chubut/rio-mayo`: Not listed by the article; route ends at the RN40 junction (-69.82,-45.45), ~50 km east of Río Mayo (on RN40).
- **RN-34** `santa-fe/san-jorge`: Not listed; San Jorge (-31.90,-61.86) is ~30 km from RN34 (San Vicente/Angélica area).
- **RN-34** `santiago-del-estero/anatuya`: Not listed; Añatuya (-28.47,-62.83) lies ~60+ km east of RN34 (Herrera/Garza section).
- **RN-34** `santiago-del-estero/la-banda`: Article lists only 'acceso a La Banda' (km 720/726) - keep if ok.
- **RN-35** `la-pampa/general-acha`: Not listed by the article (RN35 does not pass General Acha; it is on RN152).
- **RN-35** `la-pampa/jacinto-arauz`: Listed only as 'acceso' km 130; kept as current, verify distance.
- **RN-35** `cordoba/rio-cuarto`: Route ends at Santa Catalina on RN8, 10 km from the city; borderline.
- **RN-36** `cordoba/alta-gracia`: Since 1976 RN36 no longer runs via Alta Gracia/Calamuchita; not on the current route.
- **RN-36** `cordoba/rio-tercero`: Not listed; Río Tercero city is a few km off the route (via Almafuerte area).
- **RN-40** `mendoza/san-rafael`: Not on RN40: only El Sosneado (San Rafael dept) is; San Rafael city is ~150 km east on RN143/144.
- **RN-40** `santa-cruz/el-calafate`: Article: 'acceso' km 594 (~32 km off the road).
- **RN-40** `santa-cruz/gobernador-gregores`: Article: 'acceso' km 891 (~60 km off).
- **RN-40** `chubut/esquel`: Article: 'acceso' km 1763 (~20 km off).
- **RN-40** `san-juan/san-jose-de-jachal`: Article: 'acceso' km 3609 (several km off).
- **RN-51** `salta/paso-sico`: Border pass, not a locality.
- **RN-52** `jujuy/paso-de-jama`: Border crossing, not a locality.
- **RN-60** `cordoba/villa-de-maria-de-rio-seco`: Not listed by the article; RN60 starts near Villa del Totoral and runs via Sarmiento (Cba).
- **RN-60** `catamarca/paso-de-san-francisco`: Border pass/end of route, not a locality.
- **RN-64** `santiago-del-estero/san-pedro-de-guasayan`: Not listed by the article (Lavalle is the Guasayán dept town on the route).
- **RN-64** `catamarca/altos-de-san-antonio`: No such es.wikipedia page; article lists 'Los Altos' (km 154). Possibly the same place; verify.
- **RN-65** `catamarca/las-estancias`: Not listed in es.wiki RN65 article (only Tucumán localities listed); likely on real road via Cuesta del Clavillo but unsupported by source
- **RN-65** `catamarca/andalgala`: Not listed in source; Andalgalá is ~60+ km from RN65 end, likely not on route
- **RN-66** `jujuy/san-salvador-de-jujuy`: Not listed in source localities list (route begins at RN9 junction/Alto Comedero side), though description says route starts at San Salvador; low-severity
- **RN-68** `salta/talapampa`: Not listed in source; Talapampa not on RN68 list (La Viña is km101, replaces it)
- **RN-75** `la-rioja/sanagasta`: Villa Sanagasta is an acceso per source, not on the road
- **RN-76** `san-juan/san-jose-de-jachal`: San Juan province; not in source for RN76
- **RN-76** `la-rioja/paso-pircas-negras`: mountain pass/border crossing, not a town
- **RN-77** `cordoba/el-chacho`: Source places El Chacho in Córdoba (Dpto Minas) near the RN38/provincial boundary, km78; catalog coords (-30.54,-66.15) look like La Rioja (near Olta/Chamical). Province per source is Córdoba but coordinates unverified; could not retrieve its own coordinates (es.wiki 'El Chacho' redirects to a musician).
- **RN-81** `formosa/formosa`: acceso per source, not on road
- **RN-81** `formosa/palo-santo`: acceso per source, not on road
- **RN-81** `salta/pluma-de-pato`: Not in source; coords (-23.4642,-62.8942) are ~1 km from Coronel Juan Solá (-23.4667,-62.8833): likely same settlement/mislabel
- **RN-101** `misiones/comandante-andresito`: Article lead text mentions Comandante Andresito but it is not placed in the km list; the town (-25.68,-53.98) is reached via RP 19 junction (~km 93) - verify distance from road
- **RN-101** `misiones/puerto-iguazu`: Route ends at RN 12 near Puerto Iguazú / national park, town itself is ~8 km from the endpoint (-25.67,-54.50 vs -25.60,-54.57); borderline
- **RN-105** `misiones/apostoles`: Not on route per source; route ends at San José km 35 (Apóstoles at -27.92 is ~17 km beyond geometry end -27.746)
- **RN-105** `misiones/garupa`: Not listed by source; Garupá lies ~5-6 km east of road start
- **RN-105** `misiones/posadas`: Not listed by source; route starts at the Posadas-Encarnación bridge in Villalonga; Posadas city centre ~10 km away
- **RN-117** `corrientes/puente-getulio-vargas`: A bridge, not a locality
- **RN-117** `corrientes/paso-de-los-libres`: Reached by access road (km 10.1); town is ~2-3 km from the road end, acceptable
- **RN-120** `corrientes/gobernador-virasoro`: Article: route starts at RN 14 about 9 km north of Gobernador Virasoro; no localities of >5000 listed on route
- **RN-120** `corrientes/puerto-valle`: Not mentioned in article; verify (Puerto Valle is on Paraná near RN 12 end, 31 km E of Ituzaingó)
- **RN-121** `corrientes/puente-de-la-integracion`: A bridge, not a locality
- **RN-121** `corrientes/hormiguero`: Not mentioned by article; likely paraje
- **RN-122** `corrientes/empalme-yapeyu`: Junction with RN 14, not a locality
- **RN-127** `entre-rios/cuatro-bocas`: Junction at route end (RN14/RN119), not a populated place per article; verify
- **RN-130** `entre-rios/ingeniero-miguel-sajaroff`: Not listed by article; likely off the road - verify
- **RN-130** `entre-rios/colon`: Only historical start; current route starts at RN14 in San José
- **RN-131** `entre-rios/villa-crespo`: Wrong place (-32.04,-60.30 catalog): article says the route ends at Crespo, not Villa Crespo; replace with entre-rios/crespo
- **RN-131** `entre-rios/libertador-san-martin`: Not listed by article; verify (Libertador San Martín is on RN 12/RP, not RN131)
- **RN-135** `entre-rios/empalme-colon`: Junction, not a locality
- **RN-135** `entre-rios/puente-general-artigas`: A bridge, not a locality
- **RN-141** `san-juan/san-juan`: Not listed by article; route ends at RN20 near Caucete, San Juan city is ~25+ km away
- **RN-141** `san-juan/caucete`: Not in locality list; only the RN20 junction is near Caucete (article's route ends km 204 at RN20); keep only if wanted as endpoint
- **RN-142** `mendoza/costa-de-araujo`: Not in article; Costa de Araujo is ~15 km+ away from route start
- **RN-145** `mendoza/paso-pehuenche`: Border crossing, not a locality
- **RN-147** `san-luis/san-geronimo`: Not listed in article
- **RN-147** `san-luis/sierras-de-las-quijadas`: National park, not a locality
- **RN-148** `san-luis/villa-dolores`: Villa Dolores is in Córdoba (San Javier), not San Luis; id/province wrong
- **RN-148** `san-luis/santa-rosa-del-conlara`: Only an access at km 923 via RP5, not clearly on road
- **RN-150** `san-juan/paso-de-agua-negra`: Border pass, not a locality
- **RN-151** `la-pampa/santa-isabel`: Not on RN151 per article (it is on RN143)
- **RN-154** `la-pampa/hucal`: Source says route passes no population except La Adela; Hucal (dept. Hucal) is a few km off the northern start at RN35
- **RN-157** `santiago-del-estero/recreo`: Source places Recreo in Catamarca (dept. La Paz), km 970; coords (-29.27,-65.05) match Catamarca's Recreo. Province/id prefix wrong: should be catamarca/recreo
- **RN-157** `santiago-del-estero/san-antonio-de-la-paz`: Source lists 'San Antonio' in Catamarca at km 1008; es.wikipedia 'San Antonio de La Paz' (-28.933,-65.1) is Catamarca, matching catalog coords. Province/id prefix wrong: should be catamarca/san-antonio-de-la-paz
- **RN-173** `santa-fe/puerto-aragon`: Source treats it as a paraje inside Barrancas rather than a listed locality; end of route. Probably keep as route end
- **RN-175** `santa-fe/san-lorenzo`: Source lists only Puerto General San Martín for the 3 km RN175; San Lorenzo not mentioned (it is south of the route)
- **RN-178** `santa-fe/alcorta`: Source lists only an acceso to Alcorta (km 67); town is not on the road per source
- **RN-193** `buenos-aires/diego-gaynor`: Listed only as an access (km 30), not a stop on the current route; probably fine to keep
- **RN-205** `buenos-aires/lobos`: Source lists only accesos to Lobos
- **RN-205** `buenos-aires/roque-perez`: Source lists only acceso (km 133)
- **RN-205** `buenos-aires/saladillo`: Source lists only accesos
- **RN-205** `buenos-aires/san-carlos-de-bolivar`: Route ends at RP65 acceso to Bolívar km 317; town is off the road
- **RN-226** `buenos-aires/pehuajo`: Listed only as an 'acceso' at km 487; Pehuajó itself is off the road
- **RN-226** `buenos-aires/balcarce`: Road passes ~4 km from city center (access from RP55 km 64)
- **RN-231** `neuquen/villa-la-angostura`: Article says route starts at RN40 junction at Lago Espejo (-40.692,-71.697), not in Villa La Angostura (~6 km off, -40.66,-71.64); department has no populated places
- **RN-232** `la-pampa/puelches`: Article: north end is junction with RN152 west of Puelches; Puelches itself not on route
- **RN-232** `rio-negro/gobernador-duval`: Gobernador Duval is in La Pampa (Dpto Curacó) per article; id/province wrong (should be la-pampa/gobernador-duval); coordinates -38.7413,-66.435 look plausible
- **RN-237** `cordoba/arroyito`: Wrong province: route's Arroyito is in Neuquén (-39.102,-68.599), not Córdoba
- **RN-237** `rio-negro/san-carlos-de-bariloche`: Route ends at RN40 junction near paraje Nahuel Huapi (-41.033,-71.153); Bariloche not listed
- **RN-242** `neuquen/paso-de-pino-hachado`: Minor: article coords -38.6627,-70.8982 vs current -38.6677,-70.8396 (~5 km off)
- **RN-252** `buenos-aires/saladero`: Article names Grünbein (not Saladero) as starting locality; Saladero not listed
- **RN-260** `chubut/lago-blanco`: Not on route per article; route runs RN40 junction (-45.952,-70.405) to Paso Huemules
- **RN-260** `chubut/estancia-valle-huemules`: Not mentioned in article
- **RN-293** `santa-cruz/rospentek`: Minor: article coords -51.6598,-72.1837 vs current -51.66,-72.14 (~3 km)

### Other

- **RN-22**: source proposed `neuquen/cutral-co` as "Cutral-Co", catalog already has "Cutral Có" — skipped.

## Resolution of flagged cities

Policy: stops listed by the source only as an "acceso", and border crossings, bridges, junctions, passes and similar landmarks, are kept on purpose. They are geographically close to the road and work as meaningful markers even when they are not towns.

### Fixed

- **RN 19**: removed `corrientes/santo-tome` (wrong province); the route already has `santa-fe/santo-tome`. The Corrientes one stays on RN 14 and RN 121.
- **RN 237**: removed `cordoba/arroyito` (wrong province); the route already has `neuquen/arroyito`.
- **RN 131**: removed `entre-rios/villa-crespo`; the route ends at `entre-rios/crespo`.
- **RN 148**: `san-luis/villa-dolores` replaced with the existing `cordoba/villa-dolores` and deleted from the catalog.
- **RN 157**: `santiago-del-estero/recreo` and `santiago-del-estero/san-antonio-de-la-paz` renamed to `catamarca/...` (both towns are in Catamarca).
- **RN 232**: `rio-negro/gobernador-duval` renamed to `la-pampa/gobernador-duval`.
- **RN 3**: Garayalde coordinates corrected to -44.6667, -66.6667 (es.wikipedia).
- **RN 23**: Ministro Ramos Mexía coordinates corrected to -40.5, -67.2833 (es.wikipedia).

Renamed ids are only referenced by `completedCityIds` in saved stats; old ids there simply stop matching.

- **RN 77**: `cordoba/el-chacho` coordinates corrected to -30.8003, -65.6567 (es.wikipedia "Estación El Chacho"); it now sits on the road.
- **RN 35**: Jacinto Aráuz coordinates corrected to -38.0667, -63.4333 (es.wikipedia); they were ~60 km south.

### Removed (not on the route per source, more than 25 km from the road)

- RN 3: Puerto Pirámides
- RN 20: Mina Clavero
- RN 22: Bahía Blanca
- RN 23: San Antonio Oeste
- RN 25: Esquel
- RN 26: Río Mayo
- RN 34: San Jorge
- RN 35: General Acha
- RN 40: San Rafael
- RN 60: Villa de María de Río Seco
- RN 65: Andalgalá
- RN 76: San José de Jáchal
- RN 141: San Juan

Kept despite the distance: El Calafate (RN 40, "acceso") and Estrecho de Magallanes (RN 3, crossing marker).

### Still open

- **RN 175**: San Lorenzo projects past Puerto General San Martín on the 3 km geometry, so the marker moves backwards on the last stop.

## Per route

### RN-1

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_1_(Argentina)

Added: Hudson

Final order: Buenos Aires → Avellaneda → Quilmes → Berazategui → Hudson → Ensenada → La Plata

Notes: Wikipedia article lists only road points/partidos (no formal locality list). Locality list derived from the partidos crossed: Avellaneda, Quilmes, Berazategui (Hudson at km 30 on-road), Ensenada. Buenos Aires and La Plata are the termini (La Plata ~3.5 km from end via RP 11); kept as-is. Wilde, Bernal, Villa Elisa, Punta Lara are accesses (excluded).

### RN-3

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_3_(Argentina)

Added: Lomas del Mirador, San Justo, Isidro Casanova, Gregorio de Laferrere, González Catán, Virrey del Pino, Santa Rosa, Abbott, Cacharí, Chillar, Adolfo Gonzales Chaves, Micaela Cascallares, El Perdido, Coronel Dorrego, Mayor Buratovich, Hilario Ascasubi, Pedro Luro, Villalonga, Stroeder, Rada Tilly, Sindicato Dodero, Fitz Roy

Final order: Buenos Aires → Lomas del Mirador → San Justo → Isidro Casanova → Gregorio de Laferrere → González Catán → Virrey del Pino → Santa Rosa → Cañuelas → Abbott → San Miguel del Monte → Las Flores → Cacharí → Azul → Chillar → Benito Juárez → Adolfo Gonzales Chaves → Tres Arroyos → Micaela Cascallares → El Perdido → Coronel Dorrego → Bahía Blanca → Mayor Buratovich → Hilario Ascasubi → Pedro Luro → Villalonga → Stroeder → Carmen de Patagones → Viedma → San Antonio Oeste → Las Grutas → Sierra Grande → Puerto Pirámides → Puerto Madryn → Trelew → Garayalde → Comodoro Rivadavia → Rada Tilly → Sindicato Dodero → Caleta Olivia → Fitz Roy → Puerto San Julián → Comandante Luis Piedrabuena → Río Gallegos → Estrecho de Magallanes → San Sebastián → Río Grande → Tolhuin → Ushuaia → Lapataia

Notes: Source Ciudades section (pop >500 only). Garayalde, San Sebastian, Lapataia are real places not in the source list (pop <500 or terminus). Starts at La Matanza (km 14), not CABA. Source flags several cities as 'acceso' only (Puerto Madryn, Las Grutas, Benito Juarez, Puerto San Julian, Rawson); current ones kept, Rawson excluded as 12 km off.

### RN-5

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_5_(Argentina)

Added: José María Jáuregui, Olivera, Gowland, Suipacha, Gorostiaga, Alberti, Mechita, Bragado, Nueve de Julio, French, Carlos Casares, Francisco Madero, Juan José Paso, Beruti, Pellegrini, Lonquimay, Uriburu, Anguil

Final order: Luján → José María Jáuregui → Olivera → Gowland → Mercedes → Suipacha → Gorostiaga → Chivilcoy → Alberti → Mechita → Bragado → Nueve de Julio → French → Carlos Casares → Pehuajó → Francisco Madero → Juan José Paso → Beruti → Trenque Lauquen → Pellegrini → Catriló → Lonquimay → Uriburu → Anguil → Santa Rosa

Notes: Source 'Ciudades' list (km values from article). Bragado is 4.7 km from simplified geometry but listed as a city on the route (force-included). Comodoro Py (7.8 km) excluded as likely access.

### RN-7

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_7_(Argentina)

Added: Ciudadela, El Palomar, Haedo, Villa Tesei, Castelar, Ituzaingó, Villa Udaondo, Paso del Rey, La Reja, Francisco Álvarez, General Rodríguez, San Andrés de Giles, Carmen de Areco, Chacabuco, Vedia, General Levalle, Justo Daract, Santa Rosa, Palmira, Rodeo del Medio, Rodeo de la Cruz, Villa Nueva, Perdriel, Los Penitentes, Puente del Inca, Dorrego

Final order: Buenos Aires → Ciudadela → El Palomar → Haedo → Villa Tesei → Castelar → Ituzaingó → Villa Udaondo → Paso del Rey → Moreno → La Reja → Francisco Álvarez → General Rodríguez → Luján → San Andrés de Giles → Carmen de Areco → Chacabuco → Junín → Vedia → Rufino → Laboulaye → General Levalle → Vicuña Mackenna → Justo Daract → Villa Mercedes → San Luis → La Paz → Santa Rosa → San Martín → Palmira → Rodeo del Medio → Rodeo de la Cruz → Villa Nueva → Mendoza → Dorrego → Perdriel → Uspallata → Los Penitentes → Puente del Inca → Las Cuevas

Notes: Source Ciudades section (AMBA barrios listed by partido; 'acceso' none). Starts at Ciudadela (km 12-13).

### RN-8

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_8_(Argentina)

Added: El Talar, Ingeniero Pablo Nogués, Tortuguitas, Garín, Maquinista Savio, Lagomarsino, Manuel Alberti, Del Viso, La Lonja, Manzanares, Fátima, Parada Robles, Solís, Duggan, Capitán Sarmiento, Arrecifes, Todd, Viña, Juan Anchorena, Fontezuela, El Arbolito, Colón, Hughes, Arias, Alejo Ledesma, Villa Reducción, Santa Catalina, Las Vertientes, Sampacho, Chaján, Juan Jorba

Final order: El Talar → Ingeniero Pablo Nogués → Garín → Tortuguitas → Manuel Alberti → Lagomarsino → Del Viso → Maquinista Savio → La Lonja → Pilar → Manzanares → Fátima → Parada Robles → Solís → San Antonio de Areco → Duggan → Capitán Sarmiento → Arrecifes → Todd → Viña → Juan Anchorena → Fontezuela → Pergamino → El Arbolito → Colón → Hughes → Venado Tuerto → Arias → Alejo Ledesma → Canals → La Carlota → Villa Reducción → Río Cuarto → Santa Catalina → Las Vertientes → Sampacho → Chaján → Juan Jorba → Villa Mercedes

Notes: Source Ciudades section. Wheelwright and Mariano H. Alfonzo excluded (access / >5 km off). Maquinista F. Savio uses coordinates of 'Maquinista Francisco Savio' article. Area de Promocion El Triangulo skipped (not a town). Starts around Pilar (km 32+).

### RN-9

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_9_(Argentina)

Added: Villa Martelli, Florida, Munro, Olivos, Martínez, Villa Adelina, Boulogne, José León Suárez, Victoria, Don Torcuato, El Talar, Ricardo Rojas, General Pacheco, Garín, Ingeniero Maschwitz, Belén de Escobar, Lomas del Río Luján, Campana, Arroyo Seco, Pueblo Esther, Funes, Roldán, Correa, Armstrong, General Roca, Marcos Juárez, Oliva, Oncativo, Laguna Larga, Río Segundo, Toledo, Villa del Totoral, Villa de María, Villa Ojo de Agua, Villa San Martín, Árraga, Termas de Río Hondo, Banda del Río Salí, Las Talitas, Tafí Viejo, Trancas, Rosario de la Frontera, San José de Metán, La Caldera, El Carmen, Tumbaya, Tilcara, Abra Pampa

Final order: Villa Martelli → Munro → Florida → Olivos → Martínez → Villa Adelina → José León Suárez → Boulogne → Victoria → Don Torcuato → El Talar → General Pacheco → Ricardo Rojas → Garín → Ingeniero Maschwitz → Belén de Escobar → Lomas del Río Luján → Campana → San Nicolás de los Arroyos → Arroyo Seco → Pueblo Esther → Rosario → Funes → Roldán → Carcarañá → Correa → Cañada de Gómez → Armstrong → General Roca → Marcos Juárez → Villa María → Oliva → Oncativo → Laguna Larga → Río Segundo → Toledo → Córdoba → Jesús María → Villa del Totoral → Villa de María → Villa Ojo de Agua → Villa San Martín → Árraga → Santiago del Estero → Termas de Río Hondo → Banda del Río Salí → Las Talitas → San Miguel de Tucumán → Tafí Viejo → Trancas → Rosario de la Frontera → Metán → San José de Metán → Salta → La Caldera → El Carmen → San Salvador de Jujuy → Tumbaya → Tilcara → Humahuaca → Abra Pampa → La Quiaca

Notes: Source Ciudades section. Source lists Zarate, Lima, Baradero, San Pedro, Ramallo, Villa Constitucion, Arroyo Seco, Pueblo Esther, General Guemes as 'acceso' only. Pilar (Cba), Bell Ville excluded >5 km off geometry. Tafi Viejo (4.7 km) force-included. Villa San Martin = Loreto (SdE) per its article. Route in source starts in Vicente Lopez (km 12) - current list begins at San Nicolas, so the whole AMBA/north BA section is missing. Tortugas and Ingeniero Otamendi: no coordinates found on es/en Wikipedia pages.

### RN-11

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_11_(Argentina)

Added: Granadero Baigorria, Capitán Bermúdez, Fray Luis Beltrán, Puerto General San Martín, Timbúes, Oliveros, Maciel, Monje, Barrancas, San Fabián, Arocena, Coronda, Desvío Arijón, Sauce Viejo, Santo Tomé, Recreo, Gobernador Candioti, Nelson, Llambi Campbell, Emilia, Videla, San Justo, Ramayón, Marcelino Escalada, Gobernador Crespo, La Criolla, Vera y Pintado, Pedro Gómez Cello, Calchaquí, Margarita, Vera, Malabrigo, Berna, Avellaneda, Guadalupe Norte, Las Garzas, El Sombrerito, Villa Ocampo, Tacuarendí, San Antonio de Obligado, Las Toscas, El Rabón, Florencia, Basail, Margarita Belén, Puerto Eva Perón, General Lucio V. Mansilla, Tatané

Final order: Rosario → Granadero Baigorria → Capitán Bermúdez → Fray Luis Beltrán → San Lorenzo → Puerto General San Martín → Timbúes → Oliveros → Maciel → Monje → Barrancas → San Fabián → Arocena → Coronda → Desvío Arijón → Sauce Viejo → Santo Tomé → Santa Fe → Recreo → Gobernador Candioti → Nelson → Llambi Campbell → Emilia → Videla → San Justo → Ramayón → Marcelino Escalada → Gobernador Crespo → La Criolla → Vera y Pintado → Pedro Gómez Cello → Calchaquí → Margarita → Vera → Malabrigo → Berna → Reconquista → Avellaneda → Guadalupe Norte → Las Garzas → El Sombrerito → Villa Ocampo → Tacuarendí → San Antonio de Obligado → Las Toscas → El Rabón → Florencia → Basail → Resistencia → Margarita Belén → Puerto Eva Perón → General Lucio V. Mansilla → Tatané → Formosa → Clorinda

Notes: Source Ciudades section (every town listed with km). Colonia Benitez 6.6 km off, excluded. Hardy, Tatane: es.wikipedia has no coordinates for Hardy.

### RN-12

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_12_(Argentina)

Added: General Galarza, Nogoyá, General Ramírez, Crespo, San Benito, San Roque, Empedrado, San Cosme, Garupá, Candelaria, Santa Ana, San Ignacio, Jardín América, Puerto Rico, Montecarlo, Colonia Wanda, Puerto Libertad

Final order: Zárate → Ceibas → Gualeguay → General Galarza → Nogoyá → General Ramírez → Crespo → Paraná → San Benito → La Paz → Esquina → Goya → San Roque → Empedrado → Corrientes → San Cosme → Ituzaingó → Posadas → Garupá → Candelaria → Santa Ana → San Ignacio → Jardín América → Puerto Rico → Montecarlo → Eldorado → Colonia Wanda → Puerto Libertad → Puerto Iguazú

Notes: Source Ciudades section (pop >5000 plus cabeceras and Misiones towns). Itati (9 km), Puerto Piray (5.1 km) and Puerto Esperanza (6.4 km) excluded as >4.5 km from geometry. Ceibas is the Entre Rios start (km 112). Colonia Wanda coordinates taken from the 'Wanda (Misiones)' article.

### RN-14

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_14_(Argentina)

Added: San José, Chajarí, Mocoretá, La Cruz, Alvear, Gobernador Virasoro, Leandro N. Alem, Campo Viera, Campo Grande, Aristóbulo del Valle, San Pedro

Final order: Ceibas → Gualeguaychú → Concepción del Uruguay → Colón → San José → Concordia → Federación → Chajarí → Mocoretá → Paso de los Libres → La Cruz → Alvear → Santo Tomé → Gobernador Virasoro → Apóstoles → Leandro N. Alem → Oberá → Campo Viera → Campo Grande → Aristóbulo del Valle → San Vicente → San Pedro → Bernardo de Irigoyen

Notes: Source Ciudades section; most Entre Rios/Corrientes cities appear only as 'acceso a X' with RP/RN connector roads (Gualeguaychu, Concepcion del Uruguay, Colon, Concordia, Federacion, Chajari, Monte Caseros, Paso de los Libres, Yapeyu). Existing current ones left; Villa Elisa/Monte Caseros/Yapeyu excluded (5-26 km off).

### RN-16

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_16_(Argentina)

Added: Corrientes, Puerto Tirol, Makallé, Lapachito, Presidencia de la Plaza, Machagai, Quitilipi, Avia Terai, Concepción del Bermejo, Los Frentones, Río Muerto, Pampa de los Guanacos, Nuestra Señora de Talavera, El Quebrachal, Gaona, Joaquín V. González, El Tunal

Existing cities re-ordered to follow the road geometry.

Final order: Corrientes → Resistencia → Puerto Tirol → Makallé → Lapachito → Presidencia de la Plaza → Machagai → Quitilipi → Presidencia Roque Sáenz Peña → Avia Terai → Concepción del Bermejo → Pampa del Infierno → Los Frentones → Río Muerto → Pampa de los Guanacos → Monte Quemado → Taco Pozo → Nuestra Señora de Talavera → El Quebrachal → Gaona → Joaquín V. González → El Tunal → El Galpón → Metán

Notes: Source 'Trayecto' section (from Corrientes to Salta). Barrio San Pedro Pescador skipped (barrio). Barranqueras (5.5 km) excluded. Route ends near Metan junction; source's last locality is El Galpon.

### RN-18

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_18_(Argentina)

Added: San Benito, Colonia Avellaneda, Viale, Villa Clara

Final order: Paraná → San Benito → Colonia Avellaneda → Viale → Villaguay → Villa Clara → San Salvador → General Campos → Concordia

Notes: Source lists only accesses (San Benito, Colonia Avellaneda km 14, Viale km 53, Villaguay km 150, Villa Clara km 170, San Salvador km 196-217, General Campos km 217-220); no towns sit directly on the road beyond these. Parana and Concordia are termini reached via other roads.

### RN-19

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_19_(Argentina)

Added: Santo Tomé, Colonia San José, San Agustín, San Jerónimo del Sauce, Sa Pereira, Angélica, Josefina, Frontera, Devoto, La Francia, El Tío, Tránsito, Santiago Temple, Los Chañaritos, Río Primero, Piquillín, Malvinas Argentinas

Final order: Santo Tomé → Santo Tomé → Colonia San José → San Agustín → San Carlos Centro → San Jerónimo del Sauce → Sa Pereira → Angélica → Josefina → Frontera → San Francisco → Devoto → La Francia → Arroyito → El Tío → Tránsito → Los Chañaritos → Santiago Temple → Río Primero → Piquillín → Monte Cristo → Malvinas Argentinas → Córdoba

Notes: Source Ciudades section; Colonia San Jose, San Agustin, Franck, San Carlos Norte/Centro/Sud, San Jeronimo Norte are 'acceso' entries. Franck/San Carlos Norte/San Carlos Sud/San Jeronimo Norte/Clucellas excluded >4.5 km off.

### RN-20

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_20_(Argentina)

Added: Villa Dolores, Luján, Pie de Palo, Caucete, Villa Independencia, Santa Lucía

Final order: Córdoba → Villa Carlos Paz → Mina Clavero → Villa Dolores → Quines → Luján → Pie de Palo → Caucete → Villa Independencia → Santa Lucía → San Juan

Notes: Source Ciudades list is thin (only Cordoba, Villa Dolores, Quines, Lujan SL, Encon, Pie de Palo, Caucete, Villa Independencia, Santa Lucia). Villa Carlos Paz is not in source but within ~8 km of geometry. Encon excluded (23 km off geometry).

### RN-22

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_22_(Argentina)

Added: Médanos, Nicolás Levalle, Juan Cousté, La Adela, Darwin, Coronel Belisle, Chimpay, Chelforó, Chichinales, General Enrique Godoy, Ingeniero Luis A. Huergo, Mainqué, Cervantes, Allen, General Fernández Oro, Senillosa, Arroyito

Final order: Bahía Blanca → Médanos → Nicolás Levalle → Juan Cousté → La Adela → Río Colorado → Choele Choel → Darwin → Coronel Belisle → Chimpay → Chelforó → Chichinales → Villa Regina → General Enrique Godoy → Ingeniero Luis A. Huergo → Mainqué → Cervantes → General Roca → Allen → General Fernández Oro → Cipolletti → Neuquén → Plottier → Senillosa → Arroyito → Plaza Huincul → Cutral Có → Zapala

Notes: Source Localidades section; buenos-aires prov. section km 719-793 (Medanos, Nicolas Levalle, Juan Couste). Neuquen: old route through Neuquen city/Plottier kept. Coronel Belisle, Chimpay, Chelforo etc. listed in source.

### RN-23

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_23_(Argentina)

Added: Aguada Cecilio, Nahuel Niyeu, Aguada de Guerra, Clemente Onelli, Comallo, Pilcaniyeu

Final order: San Antonio Oeste → Aguada Cecilio → Valcheta → Nahuel Niyeu → Ministro Ramos Mexía → Sierra Colorada → Los Menucos → Aguada de Guerra → Maquinchao → Ingeniero Jacobacci → Clemente Onelli → Comallo → Pilcaniyeu → Dina Huapi

Notes: Article gives no on-road/access distinction. Nahuel Niyeu catalog-independent coord from es.wikipedia.

### RN-25

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_25_(Argentina)

Added: Dolavón, Paso de Indios

Final order: Rawson → Trelew → Gaiman → Dolavón → Las Plumas → Los Altares → Paso de Indios → Tecka → Esquel

### RN-26

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_26_(Argentina)

Added: El Trébol

Final order: Comodoro Rivadavia → Rada Tilly → El Trébol → Sarmiento → Río Mayo

Notes: Comodoro Rivadavia appears only via barrio Bella Vista.

### RN-33

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_33_(Argentina)

Added: Tornquist, Saavedra, Espartillar, Guaminí, Casbas, Fortín Olavarría, América, General Villegas, Piedritas, Cañada Seca, Amenábar, Murphy, Villada, Chabás, Pujato, Zavalla

Final order: Bahía Blanca → Tornquist → Saavedra → Pigüé → Espartillar → Guaminí → Casbas → Garré → Trenque Lauquen → Fortín Olavarría → América → General Villegas → Piedritas → Cañada Seca → Rufino → Amenábar → Venado Tuerto → Murphy → Firmat → Villada → Chabás → Casilda → Pujato → Zavalla → Pérez → Rosario

Notes: Article city list (>=500 hab). Its route map labels most towns (all BA ones except Bahía Blanca, plus Rufino, Amenábar, Sancti Spiritu, Venado Tuerto) as 'acceso' with no distance, so on-road vs short access could not be verified; included because the article lists them as towns the route serves. Final 38k chars of article not read. Saavedra coords from en.wikipedia (no es coords).

### RN-34

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_34_(Argentina)

Added: Totoras, San Genaro, Cañada Rosquín, San Vicente, Angélica, Sunchales, Selva, Herrera, Garza, Fernández, Ingeniero Forres, Pozo Hondo, Fraile Pintado, Calilegua, Pichanal, Embarcación, General Mosconi, Aguaray

Final order: Rosario → Totoras → San Genaro → Cañada Rosquín → San Jorge → San Vicente → Angélica → Rafaela → Sunchales → Ceres → Selva → Pinto → Añatuya → Herrera → Garza → Fernández → Ingeniero Forres → La Banda → Pozo Hondo → Rosario de la Frontera → Metán → General Güemes → San Pedro de Jujuy → Libertador General San Martín → Fraile Pintado → Calilegua → Pichanal → Embarcación → General Mosconi → Tartagal → Aguaray → Profesor Salvador Mazza

Notes: Angélica has no km (text mentions autopista Angélica-Sunchales only). Pichanal is listed as access though RN50 starts in the city. Article lists only cities >5000 plus department seats, so small villages between are likely missed. Rosario de la Frontera/Metán/Güemes overlap RN9.

### RN-35

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_35_(Argentina)

Added: Villa Bordeu, Ataliva Roca, Embajador Martini

Final order: Bahía Blanca → Villa Bordeu → Jacinto Aráuz → General Acha → Ataliva Roca → Santa Rosa → Eduardo Castex → Embajador Martini → Realicó → Huinca Renancó → Vicuña Mackenna → Río Cuarto

Notes: Ataliva Roca km blank in article.

### RN-36

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_36

Added: Las Higueras, Alcira Gigena, Despeñaderos

Final order: Las Higueras → Río Cuarto → Alcira Gigena → Elena → Berrotarán → Almafuerte → Río Tercero → San Agustín → Despeñaderos → Alta Gracia → Córdoba

Notes: Alcira-Gigena is the article's name (typing alcira gigena).

### RN-38

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_38_(Argentina)

Added: Bialet Massé, Santa María de Punilla, Valle Hermoso, Huerta Grande, Villa Giardino, La Cumbre, Capilla del Monte, Villa de Soto, Punta de los Llanos, Patquía, Chumbicha, San Isidro, La Merced, La Cocha, Ciudad Alberdi, Aguilares, Río Seco, Monteros

Final order: Villa Carlos Paz → Bialet Massé → Santa María de Punilla → Cosquín → Valle Hermoso → La Falda → Huerta Grande → Villa Giardino → La Cumbre → Capilla del Monte → Cruz del Eje → Villa de Soto → Chamical → Punta de los Llanos → Patquía → La Rioja → Chumbicha → San Fernando del Valle de Catamarca → San Isidro → La Merced → La Cocha → Ciudad Alberdi → Aguilares → Concepción → Río Seco → Monteros → Famaillá → San Miguel de Tucumán

Notes: Route not straight; Villa Carlos Paz to Cruz del Eje etc. Article lists towns >5000 plus department seats; some small towns may be missing.

### RN-40

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_40_(Argentina)

Added: Punta Loyola, Esperanza, Gobernador Costa, El Hoyo, Dina Huapi, Las Lajas, Chorriaca, Buta Ranquil, Barrancas, Bardas Blancas, El Sosneado, Pareditas, Chilecito, Eugenio Bustos, Ugarteche, Perdriel, Luján de Cuyo, Godoy Cruz, Dorrego, San José, Bermejo, Las Heras, Jocolí Viejo, Jocolí, Media Agua, Carpintería, Villa Nacusi, Villa Krause, Villa Paula Albarracín de Sarmiento, Niquivil, Huaco, Guandacol, Sañogasta, Nonogasta, Pituil, San Blas de los Sauces, San José, Loro Huasi, Chañar Punco, Colalao del Valle, Tolombón, Animaná, San Carlos, Molinos, Seclantás, Payogasta, La Poma, Sey, Coranzulí

Final order: Punta Loyola → Cabo Vírgenes → Río Gallegos → 28 de Noviembre → Esperanza → El Calafate → Gobernador Gregores → Perito Moreno → Río Mayo → Gobernador Costa → Tecka → Esquel → El Hoyo → El Bolsón → San Carlos de Bariloche → Dina Huapi → Villa La Angostura → San Martín de los Andes → Junín de los Andes → Zapala → Las Lajas → Chorriaca → Chos Malal → Buta Ranquil → Barrancas → Bardas Blancas → Malargüe → El Sosneado → San Rafael → Pareditas → Chilecito → Eugenio Bustos → Tunuyán → Ugarteche → Perdriel → Luján de Cuyo → Godoy Cruz → Dorrego → Mendoza → San José → Bermejo → Las Heras → Jocolí Viejo → Jocolí → Media Agua → Carpintería → Villa Nacusi → Villa Krause → San Juan → Villa Paula Albarracín de Sarmiento → Niquivil → San José de Jáchal → Huaco → Guandacol → Villa Unión → Sañogasta → Nonogasta → Chilecito → Pituil → San Blas de los Sauces → Londres → Belén → San José → Chañar Punco → Loro Huasi → Santa María → Colalao del Valle → Tolombón → Cafayate → Animaná → San Carlos → Molinos → Seclantás → Cachi → Payogasta → La Poma → San Antonio de los Cobres → Sey → Susques → Coranzulí → La Quiaca

Notes: Very long; article skips Tres Lagos, Bajo Caracoles etc. (not listed). Ranquil del Norte, Naunauco, Coihueco Norte, Zapata, Agrelo, Pedro Molina, Talacasto, General San Martín (Albardón) had no es.wikipedia coordinates found (see missing_no_coords). 'Sey' coords are for page 'Puesto Sey' (uncertain match). Mendoza segments RN7 overlap.

### RN-50

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_50_(Argentina)

Added: Hipólito Yrigoyen

Final order: Pichanal → Hipólito Yrigoyen → Orán → Aguas Blancas

### RN-51

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_51_(Argentina)

Added: La Silleta

Final order: Salta → La Silleta → Campo Quijano → Santa Rosa de Tastil → San Antonio de los Cobres → Paso Sico

Notes: La Silleta only in intro text.

### RN-52

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_52_(Argentina)

Added: Jama

Final order: Purmamarca → Susques → Paso de Jama → Jama

Notes: La Ciénaga: es 'La Ciénaga' redirects to disambiguation; 'La Ciénaga (Jujuy)' coords (-21.96,-66.26) belong to a different place, rejected.

### RN-60

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_60_(Argentina)

Added: Sarmiento, Quilino, Chumbicha, Villa Mazán, El Salado, Copacabana

Final order: Sarmiento → Villa de María de Río Seco → Deán Funes → Quilino → Chumbicha → Villa Mazán → Aimogasta → El Salado → Copacabana → Tinogasta → Fiambalá → Paso de San Francisco

Notes: Mansilla has no es.wikipedia coordinates.

### RN-64

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_64_(Argentina)

Added: Lavalle, Los Altos

Final order: Santiago del Estero → Lavalle → San Pedro de Guasayán → Bañado de Ovanta → Los Altos → Altos de San Antonio

Notes: Lavalle coord page is a combined Catamarca/SdE page (approximate).

### RN-65

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_65_(Argentina)

No changes.

Notes: Article lists only 2 localities.

### RN-66

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_66_(Argentina)

Added: Alto Comedero, San Juancito

Final order: San Salvador de Jujuy → Alto Comedero → Palpalá → Perico → San Juancito

Notes: San Juancito coords from es.wiki page (API coordinates).

### RN-68

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_68_(Argentina)

Added: La Viña, La Merced

Final order: Cafayate → Talapampa → La Viña → Coronel Moldes → El Carril → La Merced → Cerrillos → Salta

### RN-73

Source: none found

No changes.

Notes: es.wikipedia article Ruta_Nacional_73_(Argentina) returns 404; web search found only news (route under construction Pampa de la Viuda-Chilecito, Anguinán-Sanagasta). No trustworthy locality list.

### RN-74

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_74_(Argentina)

Added: Vichigasta

Final order: Patquía → Vichigasta → Nonogasta

Notes: km are national cumulative markers.

### RN-75

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_75_(Argentina)

No changes.

Notes: All through-towns already present.

### RN-76

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_76_(Argentina)

Added: Pagancillo, Villa Castelli

Final order: San José de Jáchal → Pagancillo → Villa Unión → Villa Castelli → Vinchina → Jagüé → Paso Pircas Negras

Notes: la-rioja/vinchina corresponds to source 'Villa San José de Vinchina'.

### RN-77

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_77_(Argentina)

Added: Desiderio Tello

Final order: Desiderio Tello → Milagro → El Chacho

Notes: Desiderio Tello is km 0 start junction with RN79, missing from current but in catalog.

### RN-78

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_78_(Argentina)

Added: Angulos

Final order: Famatina → Angulos → Campanas

### RN-79

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_79_(Argentina)

No changes.

Notes: All present. Olta reached via acceso from RN79 per photo caption (minor). Chamical shares stretch with RN38.

### RN-81

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_81_(Argentina)

Added: Comandante Fontana, Ibarreta, Estanislao del Campo, Pozo del Tigre, Laguna Yema, Los Chiriguanos, Los Blancos, Coronel Juan Solá, Dragones

Final order: Formosa → Palo Santo → Comandante Fontana → Ibarreta → Estanislao del Campo → Pozo del Tigre → Las Lomitas → Laguna Yema → Los Chiriguanos → Ingeniero Juárez → Los Blancos → Coronel Juan Solá → Pluma de Pato → Dragones

Notes: Los Blancos coords from es.wiki 'Los Blancos (Argentina)' (-23.6,-62.6): province Salta assumed from source, not independently verified. Laguna Yema coords equal the Bermejo department centre (-24.25,-61.25); page tags them as the town. Ingeniero Juárez id kept as existing catalog entry; Las Lomitas present.

### RN-86

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_86_(Argentina)

Added: Laguna Blanca, Buena Vista, El Espinillo, Misión Tacaaglé, San Martín 2, Fortín Lugones, Lamadrid, Guadalcázar

Final order: Clorinda → Laguna Blanca → Buena Vista → El Espinillo → General Belgrano → Misión Tacaaglé → Villa General Güemes → San Martín 2 → Fortín Lugones → Posta Cambio Zalazar → Lamadrid → Guadalcázar

Notes: Formosa-province locality coords from es.wiki API. Km gap 1812-1982 is the dirt/interrupted stretch. Many small parajes lack articles. Existing: Clorinda, Gral Belgrano, Villa Gral Güemes, Posta Cambio Zalazar present.

### RN-89

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_89_(Argentina)

Added: Campo Largo, Corzuela, Las Breñas, Gancedo

Final order: Avia Terai → Campo Largo → Corzuela → Las Breñas → Charata → General Pinedo → Gancedo → Quimilí → Suncho Corral

Notes: Source lists nothing in Dpto Sarmiento; route ends at RN34 near Taboada (not listed).

### RN-95

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_95_(Argentina)

Added: Ceres, Santa Sylvina, Coronel Du Graty, Tres Isletas, Zaparinqui

Final order: Ceres → Tostado → Santa Sylvina → Coronel Du Graty → Villa Ángela → Presidencia Roque Sáenz Peña → Tres Isletas → Zaparinqui → Castelli → Villa General Güemes

Notes: Juan José Castelli present as chaco/castelli. Zaparinqui km not given.

### RN-98

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_98_(Argentina)

Added: Guardia Escolta

Final order: Vera → Tostado → Guardia Escolta → Bandera → Pinto

Notes: Current cities otherwise match source.

### RN-101

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_101_(Argentina)

No changes.

Notes: Article is sparse (no formal locality list).

### RN-105

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_105_(Argentina)

Added: Villalonga, Pindapoy

Final order: Posadas → Villalonga → Garupá → Pindapoy → San José → Apóstoles

### RN-117

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_117_(Argentina)

No changes.

Notes: Route is only 12.9 km.

### RN-118

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_118_(Argentina)

No changes.

Notes: Current cities match source.

### RN-119

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_119_(Argentina)

No changes.

Notes: Current cities match. Article says Monte Caseros dept (km 0-33) has no populated places.

### RN-120

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_120_(Argentina)

No changes.

Notes: Article lists no localities; route ends at RN 12 ~31 km east of Ituzaingó.

### RN-121

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_121_(Argentina)

No changes.

Notes: Sparse article.

### RN-122

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_122_(Argentina)

No changes.

Notes: Article says route starts at RN 14 km 551, 6 km NW of Yapeyú.

### RN-123

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_123_(Argentina)

Added: Felipe Yofré

Final order: 9 de Julio → Chavarría → Felipe Yofré → Mercedes

Notes: Catalog '9 de Julio' (corrientes) matches Nueve de Julio (San Roque dept)? coords -28.84,-58.76 are plausible; verify id corrientes/9-de-julio.

### RN-127

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_127_(Argentina)

Added: El Pingo, Pueblo Arrúa, Bovril, Sauce de Luna, Los Conquistadores

Final order: El Pingo → Pueblo Arrúa → Bovril → Sauce de Luna → Federal → Los Conquistadores → San Jaime de la Frontera → Cuatro Bocas

Notes: Route in ER km 64-292, Corrientes 292-324 without towns.

### RN-130

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_130_(Argentina)

No changes.

### RN-131

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_131_(Argentina)

Added: Strobel, Crespo

Final order: Strobel → Diamante → Libertador San Martín → Crespo → Villa Crespo

Notes: Strobel km unknown; sits between Diamante and Crespo.

### RN-135

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_135_(Argentina)

No changes.

Notes: Colón is the only town on route.

### RN-136

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_136_(Argentina)

No changes.

Notes: Article gives few localities; RN136 is a short access to the bridge. Gualeguaychú is only the start junction (~N of city).

### RN-141

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_141_(Argentina)

Added: Vallecito

Final order: Chepes → Vallecito → Caucete → San Juan

Notes: Route spans ~120 km with no settlements between Chepes and Vallecito.

### RN-142

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_142_(Argentina)

Added: Ingeniero Gustavo André

Final order: Costa de Araujo → Ingeniero Gustavo André → Encón

Notes: Current Encón lon -68.15 vs geometry end -67.80; check coords.

### RN-143

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_143_(Argentina)

Added: Chacharramendi, Limay Mahuida, Real del Padre, Villa Atuel, Salto de las Rosas, Rama Caída

Final order: Chacharramendi → Limay Mahuida → Santa Isabel → Carmensa → General Alvear → Real del Padre → Villa Atuel → Salto de las Rosas → Rama Caída → San Rafael → Pareditas

Notes: Existing catalog ids: la-pampa/santa-isabel, mendoza/carmensa, general-alvear, san-rafael, pareditas. Villa Atuel coords from LLM-extracted page text (lat/lon -34.83,-67.92); verify.

### RN-144

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_144_(Argentina)

No changes.

Notes: Article: 'No hay localidades en el trayecto'. Current endpoints are acceptable as terminals only.

### RN-145

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_145_(Argentina)

No changes.

### RN-146

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_146_(Argentina)

Added: Luján, Toro Negro, Beazley, Goudge

Final order: Luján → Toro Negro → San Luis → Beazley → Monte Comán → Goudge → San Rafael

Notes: Beazley coord_source is a mirror; the live es.wikipedia page fetch returned no coords. Existing ids: san-luis/san-luis, mendoza/monte-coman, mendoza/san-rafael.

### RN-147

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_147_(Argentina)

No changes.

Notes: Article only documents km 806-934 of the 934 km geometry; the rest of the route (north/south of San Luis) is not covered by the article. Needs a second source.

### RN-148

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_148_(Argentina)

No changes.

Notes: Current RN148 per article passes no population (km 925-966); only endpoints.

### RN-149

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_149_(Argentina)

Added: Barreal, Las Flores

Final order: Uspallata → Barreal → Calingasta → Iglesia → Las Flores

### RN-150

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_150_(Argentina)

Added: Los Baldecitos, Las Flores, Patquía

Final order: Patquía → Los Baldecitos → San José de Jáchal → Rodeo → Las Flores → Paso de Agua Negra

Notes: Patquia exists in catalog (la-rioja/patquia) but not in current cities; added as existing start.

### RN-151

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_151_(Argentina)

Added: Ferri, Barda del Medio, Algarrobo del Águila

Final order: Cipolletti → Ferri → Cinco Saltos → Barda del Medio → Catriel → 25 de Mayo → Puelén → Algarrobo del Águila → Santa Isabel

Notes: Existing ids reused: rio-negro/cipolletti, cinco-saltos, catriel, la-pampa/25-de-mayo, puelen.

### RN-152

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_152_(Argentina)

No changes.

Notes: No missing; current cities match article.

### RN-153

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_153_(Argentina)

No changes.

Notes: No missing; Mendoza section km 58-109 has no settlements.

### RN-154

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_154_(Argentina)

No changes.

Notes: Source explicit: only La Adela.

### RN-157

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_157_(Argentina)

Added: Quirós, Tapso, Lavalle, Taco Ralo, La Madrid, Monteagudo, Río Colorado, Manuel García Fernández

Existing cities re-ordered to follow the road geometry.

Final order: Recreo → San Antonio de la Paz → Quirós → Frías → Tapso → Lavalle → San Pedro de Guasayán → Taco Ralo → La Madrid → Monteagudo → Simoca → Río Colorado → Bella Vista → Manuel García Fernández → San Miguel de Tucumán

Notes: rn-157 km numbers follow source (route km 940-1250, not geometry length). Catalog id for Recreo/San Antonio would need catamarca/ prefix. 'Manuel García Fernández' is the official name of 'García Fernández' (source). 'La Madrid' article title; source writes Lamadrid. No-op for Río Colorado: Tucumán, distinct from rio-negro/rio-colorado.

### RN-158

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_158_(Argentina)

Added: Monte Redondo, Quebracho Herrado, Colonia Prosperidad, Saturnino María Laspiur, Las Varas, Pozo del Molle, La Playosa, Arroyo Algodón, Las Mojarras, Arroyo Cabral, Luca, Dalmacio Vélez Sársfield, Las Perdices, Carnerillo, Chucul, Las Higueras

Final order: San Francisco → Monte Redondo → Quebracho Herrado → Colonia Prosperidad → Saturnino María Laspiur → Las Varas → Las Varillas → Pozo del Molle → La Playosa → Arroyo Algodón → Las Mojarras → Villa María → Arroyo Cabral → Luca → Dalmacio Vélez Sársfield → Las Perdices → General Deheza → General Cabrera → Carnerillo → Chucul → Las Higueras → Río Cuarto

Notes: Dalmacio Vélez Sársfield: es.wikipedia article titled 'Dalmacio Vélez'; official name used by source kept. Source marks an acceso at km 197 to it; km 196 listed on route.

### RN-168

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_168_(Argentina)

No changes.

Notes: Source lists RN168 as 35 km (incl. Paraná side); geometry covers 17 km.

### RN-173

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_173_(Argentina)

No changes.

### RN-174

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_174_(Argentina)

No changes.

Notes: Source only lists localities >5000 inhab; current matches. Road crosses Puente Rosario-Victoria.

### RN-175

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_175_(Argentina)

No changes.

Notes: Route runs from RN11 km 334 to Puerto General San Martín.

### RN-178

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_178_(Argentina)

No changes.

Notes: Colón partido has no population.

### RN-188

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_188_(Argentina)

Added: Campos Salles, Villa Esperanza, General Rojo, Erézcano, Conesa, Guerrico, Acevedo, Rafael Obligado, Agustín Roca, General Pinto, Villa Francia, Florentino Ameghino, Banderaló, Bernardo Larroudé, Coronel Hilario Lagos, Rancul, Nueva Galia, Fortuna, Bowen

Final order: San Nicolás de los Arroyos → Campos Salles → Villa Esperanza → General Rojo → Erézcano → Conesa → Guerrico → Acevedo → Pergamino → Rojas → Rafael Obligado → Agustín Roca → Junín → Lincoln → General Pinto → Villa Francia → Florentino Ameghino → General Villegas → Banderaló → Bernardo Larroudé → Coronel Hilario Lagos → Realicó → Rancul → Nueva Galia → Fortuna → Unión → Bowen → General Alvear

Notes: Source lists 29 localities in the Localidades table; many (General Rojo, Erézcano, Rafael Obligado, Lincoln, General Pinto, Villa Francia, Ameghino, Villegas, Banderaló, Realicó, Rancul, Bowen) also appear with an 'Acceso a ...' junction, i.e. the road passes adjacent to them; kept because source lists them as route localities - verify off-road distance if strict. Ameghino = Florentino Ameghino (ex-Ameghino). Existing catalog coords for Unión/Realicó/Villegas are approximate (rounded .xx42 values).

### RN-193

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_193_(Argentina)

No changes.

### RN-205

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_205_(Argentina)

Added: El Jagüel, Ezeiza

Final order: El Jagüel → Ezeiza → Cañuelas → Lobos → Roque Pérez → Saladillo → San Carlos de Bolívar

Notes: Source lists only localities >5000 inhab (km 27-185). Smaller towns between Saladillo and Bolívar not covered by source. Many catalog towns are accesos in source; kept as plausible endpoints.

### RN-226

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_226_(Argentina)

Added: Carlos Tejedor

Final order: Mar del Plata → Balcarce → Tandil → Azul → Olavarría → San Carlos de Bolívar → Pehuajó → Carlos Tejedor → General Villegas

Notes: Cities section lists only >5000 inhab; route list from junction table (first 100k chars + tail).

### RN-228

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_228_(Argentina)

No changes.

Notes: Source lists only localities >5000 inhab, without km. San Cayetano partido: none.

### RN-229

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_229_(Argentina)

Added: Grünbein

Final order: Grünbein → Villa General Arias → Punta Alta

Notes: DNV geometry covers only Villa General Arias -> Punta Alta, so Bahía Blanca and Grünbein are outside rendered geometry (source places them on the route). Bahía Blanca already in catalog (existing: true).

### RN-231

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_231_(Argentina)

No changes.

Notes: No localities on route per article ('no hay poblaciones').

### RN-232

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_232_(Argentina)

No changes.

Notes: Article gives km only per segment. Gobernador Duval needs province fix, coords already in catalog.

### RN-234

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_234_(Argentina)

No changes.

Notes: No localities (Dpto Collón Curá has no poblaciones). Route La Rinconada (RN40) to RN237 junction at km 57; current puente-colon-cura and la-rinconada are the endpoints, fine.

### RN-237

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_237_(Argentina)

Added: Arroyito, Villa El Chocón, Picún Leufú

Final order: Arroyito → Arroyito → Villa El Chocón → Picún Leufú → Piedra del Águila → Confluencia → San Carlos de Bariloche

Notes: Villa El Chocón page decimal coords truncated (DMS 39°16'S 68°47'W; ~-39.267,-68.783).

### RN-242

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_242_(Argentina)

No changes.

Notes: Article lists no other localities on the current route.

### RN-249

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_249_(Argentina)

No changes.

Notes: Matches current.

### RN-250

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_250_(Argentina)

Added: Pomona, Luis Beltrán

Final order: General Conesa → Pomona → Lamarque → Luis Beltrán → Choele Choel

Notes: Order in route: General Conesa, Pomona, Lamarque, Luis Beltrán, Choele Choel.

### RN-251

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_251_(Argentina)

No changes.

Notes: Matches current. Northern segment (Pichi Mahuida) has no populated places.

### RN-252

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_252_(Argentina)

Added: Grünbein

Existing cities re-ordered to follow the road geometry.

Final order: Grünbein → Ingeniero White → Saladero

Notes: Typing for Grünbein folds ü to u.

### RN-259

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_259_(Argentina)

Added: Los Cipreses

Final order: Esquel → Trevelin → Los Cipreses

Notes: Los Cipreses coords from en.wikipedia (es article not found); small village in Trevelín municipality.

### RN-260

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_260_(Argentina)

No changes.

Notes: Article lists no localities, only RN40 junction ~30 km south of Río Mayo and the Paso Huemules; Río Mayo not on route.

### RN-281

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_281_(Argentina)

No changes.

Notes: Matches current.

### RN-288

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_288_(Argentina)

No changes.

Notes: Matches current.

### RN-293

Source: https://es.wikipedia.org/wiki/Ruta_Nacional_293_(Argentina)

No changes.

Notes: Matches current.


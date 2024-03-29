document.querySelector('.custom-file-input').addEventListener('change',function(e) {
	window.fileName = document.getElementById("selectedFile").files[0].name;
	window.filePath = document.getElementById("selectedFile").files[0].path;
  var nextSibling = e.target.nextElementSibling;
  nextSibling.innerText = fileName;
})


//---------------------------------------------------------------------
var stepped = 0, rowCount = 0, errorCount = 0, firstError;
var start, end;
var firstRun = true;
var isOnlineCheck = document.getElementById("isOnline");
var cifAux = "";
var participantes = [];

$(function()
{
	$('#btnConverter').on("click", function()
	{
		if ($(this).prop('disabled') == "true")
			return;


		stepped = 0;
		rowCount = 0;
		errorCount = 0;
		firstError = undefined;

		var config = buildConfig();
		
		// Allow only one parse at a time
		$(this).prop('disabled', true);

		if (!firstRun)
			console.log("--------------------------------------------------");
		else
			firstRun = false;

    if (!$('#selectedFile')[0].files.length)
    {
      alert("Por favor, elige un fichero.");
      return enableButton();
    }
    
    $('#selectedFile').parse({
      config: config,
      before: function(file, inputElem)
      {
        start = now();
        console.log("Parsing file...", file);
      },
      error: function(err, file)
      {
        console.log("ERROR:", err, file);
        firstError = firstError || err;
        errorCount++;
      },
      complete: function()
      {
        end = now();
        printStats("Done with all files");
      }
    });
	});
});




function printStats(msg)
{
	if (msg)
		console.log(msg);
    console.log("       Time:", (end-start || "(Unknown; your browser does not support the Performance API)"), "ms");
    console.log("  Row count:", rowCount);
	if (stepped)
		console.log("    Stepped:", stepped);
	  console.log("     Errors:", errorCount);
	if (errorCount)
		console.log("First error:", firstError);
}



// function buildConfig()
// {
// 	return {
// 		delimiter: ";",
// 		header: true,
// 		dynamicTyping: false,
// 		skipEmptyLines: true,
// 		preview: 0,
// 		step: stepFn,
// 		encoding: "UTF-8",
// 		worker: false,
// 		comments: "/*",
// 		complete: completeFn,
// 		error: errorFn,
// 		download: false
// 	};
// }

function buildConfig()
{
	return {
		delimiter: ";",
		header: false,
		dynamicTyping: false,
		complete: completeFn,
		error: errorFn,
		skipEmptyLines: true,
		encoding: "ISO-8859-1"
	};
}

function stepFn(results, parser)
{
	stepped++;
	if (results)
	{
		if (results.data)
			rowCount += results.data.length;
		if (results.errors)
		{
			errorCount += results.errors.length;
			firstError = firstError || results.errors[0];
		}
	}
}

function completeFn(results)
{
	end = now();

	if (results && results.errors)
	{
		if (results.errors)
		{
			errorCount = results.errors.length;
			firstError = results.errors[0];
		}
		if (results.data && results.data.length > 0)
			rowCount = results.data.length;
	}

	printStats("Parse complete");
	console.log("    Results:", results);

	dataTransform(results.data);

	// icky hack
	setTimeout(enableButton, 100);
}

function errorFn(err, file)
{
	end = now();
	console.log("ERROR:", err, file);
	enableButton();
}

function enableButton()
{
	$('#btnConverter').prop('disabled', false);
}

function now()
{
	return typeof window.performance !== 'undefined'
			? window.performance.now()
			: 0;
}

function dataTransform(data)
{

	// Skip Header
	data.shift();

	var courseType = $("input[name=courseType]:checked").val();
	cifAux = "";

	if (courseType == "con") {
		var finalData  = {
			"_declaration": {
				"_attributes": {
					"version": "1.0",
					"encoding": "UTF-8",
					"standalone": "yes"
				}
			},
			"NewDataSet": {
				"Participants": []
			}
		};

		participantes = finalData.NewDataSet.Participants;

		data.forEach(crearParticipanteCon);
	}
	else {
		var finalData  = {
			"_declaration": {
				"_attributes": {
					"version": "1.0",
					"encoding": "UTF-8",
					"standalone": "no"
				}
			},
			"grupos": {
				"grupo": {
					"idAccion": data[0][0],
					"idGrupo": data[0][1],
					"participantes": {
						"participante" : []
					},
					"costes": {
						"coste": {}
					}
				}
			}
		};

		participantes = finalData.grupos.grupo.participantes.participante;

		data.forEach(crearParticipante);

		var coste = finalData.grupos.grupo.costes.coste;

		if (courseType == "bon") {
			coste["directos"] = "100";
			coste["indirectos"] = "0";
			coste["salariales"] = "0";
			coste["periodos"] = {
				"periodo": {
					"mes": "12",
					"importe": "0"
				}
			};
		}
		else if (courseType == "grp") {
			coste["cifagrupada"] = cifAux;
			coste["directos"] = "100.00";
			coste["indirectos"] = "0";
			coste["salariales"] = "0";
			coste["periodos"] = {
				"periodo": {
					"mes": "12",
					"importe": "0"
				}
			};
		}
		else if (courseType == "org") {
			coste["cifagrupada"] = cifAux;
			coste["directos"] = "100.00";
			coste["indirectos"] = "0";
			coste["organizacion"] = "0";
			coste["salariales"] = "0";
			coste["periodos"] = {
				"periodo": {
					"mes": "12",
					"importe": "0"
				}
			};
		}
	}

	xmlConvert(finalData);
}

function crearParticipante(item)
{
	var courseType = $("input[name=courseType]:checked").val();

	item.map(function(e){return e.trim();});

	let tipoDocumento = "";
	let cifEmpresa = item[9];
	let discapacidad = false;
	let afectadosTerrorismo = false;
	let afectadosViolenciaGenero = false;
	let categoriaProfesional = "";
	let grupoCotizacion = item[17].split(" ")[0];
	let nivelEstudios = "";
	let diplomaAcreditativo = "N";


	if (cifAux == "" && cifEmpresa != "")
		cifAux = cifEmpresa;

	if (item[2] == "NIF")
		tipoDocumento = "10";
	else if (item[2] == "NIE")
		tipoDocumento = "60";
	else
		tipoDocumento = "0";

	if (item[13].toLowerCase() == "si" || item[13].toLowerCase() == "sí")
		discapacidad = true;

	if (item[14].toLowerCase() == "si" || item[14].toLowerCase() == "sí")
		afectadosTerrorismo = true;

	if (item[15].toLowerCase() == "si" || item[15].toLowerCase() == "sí")
		afectadosViolenciaGenero = true;
	
	if (item[22].toLowerCase() == "si" || item[22].toLowerCase() == "sí")
		diplomaAcreditativo = "S";

	if (item[16] == "Directivo")
		categoriaProfesional = "1";
	else if (item[16] == "Mando Intermedio")
		categoriaProfesional = "2";
	else if (item[16] == "Técnico")
		categoriaProfesional = "3";
	else if (item[16] == "Trabajador Cualificado")
		categoriaProfesional = "4";
	else if (item[16] == "Trabajador con Baja Cualificación")
		categoriaProfesional = "5";
	else
		categoriaProfesional = "0";

	if (item[18] == "Menos que primaria")
		nivelEstudios = "1";
	else if (item[18] == "Educación primaria")
		nivelEstudios = "2";
	else if (item[18] == "Primera etapa de educación secundaria (título de primer y segundo ciclo de la ESO, EGB, Graduado Escolar, Certificados de profesionalidad nivel 1 y 2)")
		nivelEstudios = "3";
	else if (item[18] == "Segunda etapa de educación secundaria (Bachillerato, FP de grado medio, BUP, FPI y FPII)")
		nivelEstudios = "4";
	else if (item[18] == "Educación postsecundaria no superior (Certificados de Profesionalidad de nivel 3)")
		nivelEstudios = "5";
	else if (item[18] == "Técnico Superior/FP grado superior y equivalentes")
		nivelEstudios = "6";
	else if (item[18] == "E. universitarios 1º ciclo (Diplomatura-Grados)")
		nivelEstudios = "7";
	else if (item[18] == "E. universitarios 2º ciclo (Licenciatura- Máster)")
		nivelEstudios = "8";
	else if (item[18] == "E. Universitarios 3º ciclo (Doctorado)")
		nivelEstudios = "9";
	else if (item[18] == "Otras titulaciones")
		nivelEstudios = "10";
	else
		nivelEstudios = "0";

	if (courseType == "bon") {
		var participante = {
			"nif": item[3],
			"N_TIPO_DOCUMENTO": tipoDocumento,
			"nombre": item[4],
			"primerApellido": item[5],
			"segundoApellido": item[6],
			"niss": item[10],
			"cifEmpresa": cifEmpresa,
			"ctaCotizacion": item[21],
			"fechaNacimiento": item[11],
			"sexo": item[12],
			"email": item[7],
			"telefono": item[8],
			"discapacidad": discapacidad,
			"afectadosTerrorismo": afectadosTerrorismo,
			"afectadosViolenciaGenero": afectadosViolenciaGenero,
			"categoriaprofesional": categoriaProfesional,
			"grupocotizacion": grupoCotizacion,
			"nivelestudios": nivelEstudios,
		};
	}
	else if (courseType == "grp") {
		var participante = {
			"nif": item[3],
			"N_TIPO_DOCUMENTO": tipoDocumento,
			"nombre": item[4],
			"primerApellido": item[5],
			"segundoApellido": item[6],
			"niss": item[10],
			"cifEmpresa": cifEmpresa,
			"ctaCotizacion": item[21],
			"fechaNacimiento": item[11],
			"email": item[7],
			"telefono": item[8],
			"sexo": item[12],
			"discapacidad": discapacidad,
			"afectadosTerrorismo": afectadosTerrorismo,
			"afectadosViolenciaGenero": afectadosViolenciaGenero,
			"categoriaprofesional": categoriaProfesional,
			"grupocotizacion": grupoCotizacion,
			"nivelestudios": nivelEstudios,
		};
	}
	else if (courseType == "org") {
		var participante = {
			"nif": item[3],
			"N_TIPO_DOCUMENTO": tipoDocumento,
			"nombre": item[4],
			"primerApellido": item[5],
			"segundoApellido": item[6],
			"niss": item[10],
			"cifEmpresa": cifEmpresa,
			"ctaCotizacion": item[21],
			"fechaNacimiento": item[11],
			"email": item[7],
			"telefono": item[8],
			"sexo": item[12],
			"discapacidad": discapacidad,
			"afectadosTerrorismo": afectadosTerrorismo,
			"afectadosViolenciaGenero": afectadosViolenciaGenero,
			"categoriaprofesional": categoriaProfesional,
			"grupocotizacion": grupoCotizacion,
			"nivelestudios": nivelEstudios,
		};
	}

	if (isOnlineCheck.checked)
	{
		participante["fechaInicioTeleformacion"] = item[19];
		participante["fechaFinTeleformacion"] = item[20];
	}

	participante["DiplomaAcreditativo"] = diplomaAcreditativo;

	participantes.push(participante);
}

function crearParticipanteCon(item)
{
	item.map(function(e){return e.trim();});

	var participante = {
		"NumAccio": item[0],
		"NumGrup": item[1],
		"Baixa": item[2],
		"Nom": item[3],
		"Cognoms": item[4],
		"NIF": item[5],
		"TipusDocument": item[6],
		"NASS": item[7],
		"Colectiu": item[8],
		"Genere": item[9],
		"dataNaixement": item[10],
		"Discapacitat": item[11],
		"Adreca": item[12],
		"CP": item[13],
		"CodiMunicipi": item[14],
		"Telefon1": item[15],
		"Telefon2": item[16],
		"Email": item[17],
		"DemandantOcupacio": item[18],
		"Area": item[19],
		"Categories": item[20],
		"Estudis": item[21],
		"AturatLLargaDurada": item[22],
		"NomSentit": item[23],
		"AutoritzoDifusio": item[24],
		"IdTipusVia": item[25],
		"RequisitAcces": item[26],
		"Procedencia": item[27],
		"AfectatERTO": item[28],
		"VictimaTerrorisme": item[29],
		"VictimaViolenciaGenere": item[30],
	};

	participantes.push(participante);
}

function xmlConvert(js)
{
	var xmlOptions = {compact: true, ignoreComment: true, spaces: 4};
	var xml = convert.js2xml(js, xmlOptions);

	console.log(`file name: ${fileName}`);
	console.log(`file path: ${filePath}`);

	var xmlName = window.fileName.slice(0, -4) + ".xml";
	var xmlPath = window.filePath.slice(0, -4) + ".xml";

	var alertText = `Se va a guardar como:\n${xmlPath}.\n¿Desea continuar?`
	if(confirm(alertText))
	{
		fs.writeFile(xmlPath, xml, function(err){
			if (err) throw err;	
			console.log('Saved!');
		})
	}
}


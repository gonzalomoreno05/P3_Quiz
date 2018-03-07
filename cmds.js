const {log, biglog, errorlog, colorize} = require("./out");
const {models} = require('./model');
const Sequelize = require('sequelize');



/**
*Muestra la ayuda
*
*@param rl Objeto readline usado para implementar CLI.
*/
exports.helpCmd = rl => {
	log("Comandos:");
	log(" h|help - Muestra esta ayuda.");
	log(" list - Listar los quizzes existentes.");
	log(" show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
	log(" add - Añadir un nuevo quiz interactivamente.");
	log(" delete <id> - Borrar el quiz indicado.");
	log(" edit <id> - Editar el quiz indicado.");
	log(" test <id> - Probar el quiz indicado.");
	log(" p|play - jugar a preguntar aleatoriamente todos los quizzes.");
	log(" credits -Créditos.");
	log(" q|quit - Salir del programa.");
	rl.prompt();
};


/**
 * Lista todos los quizzes existentes en el modelo.
 * 
 * *@param rl Objeto readline usado para implementar CLI.
 */
exports.listCmd = rl => {

	models.quiz.findAll()	
	.each(quiz => {
		log(`  [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};


/**
 * Esta función devuelve una promesa que:
 *   - Valida que se ha introducido un valor para el parametro.
 *   - Convierte el parametro en un numero entero.
 * Si todo va bien, la promesa satisface y devuelve el valor de id a usar.
 * 
 * @param id Parametro con el indice a validar.
 */

const validateId = id => {
	
	return new Sequelize.Promise((resolve, reject) => {
		if (typeof id === "undefined") {
			reject(new Error(`Falta el parametro <id>.`));
		} else {
			id = parseInt(id);  // coger la parte entera y descartar lo demas
			if (Number.isNaN(id)) {
				reject(new Error(`El valor del parametro <id> no es un número.`));
			} else {
				resolve(id);
			}
		}
	});
};

/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 * 
 * @param id Clave del quiz mostrar.
 * @param rl Objeto readline usado para implementar CLI.
 */
exports.showCmd = (rl, id) => {

	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id=${id}`);
		}
		log(`[${colorize(id, 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
	})
	.catch(error => {
		errorlog(error.messsage);
	})
	.then(() => {
		rl.prompt();
	});
};
	

/**
 * Esta función convierte la llamada rl.question, que está basada en callbacks, en una
 * basada en promesas.
 * 
 * Esta función devuelve una promesa que cuando se cumple, proporciona el texto introducido
 * Entonces la llamada a then  que hay que hacer la promesa devuelta sera:
 *      .then(answer => {...})
 *      
 * También colorea en rojo el texto de la pregunta, elimina espacios al principio y al fial.
 * 
 * @param rl Objeto readline usado para implementar el CLI
 * @param text Pregunta que hay que hacerle al usarlo.
 * 
 */
const makeQuestion = (rl, text) => {
	
	return new Sequelize.Promise((resolve, reject) => {
		rl.question(colorize(text, 'red'), answer => {
			resolve(answer.trim());
		});
	});
} ;

/**
 * Añade un nuevo quiz al modelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 * 
 * @param rl Objeto readline usado para implementar CLI.
 */
exports.addCmd= rl => {

	makeQuestion(rl, ' Introduzca una pregunta: ')
	.then(q => {
		return makeQuestion(rl, ' Introduzca la respuesta: ')
		.then(a => {
			return {question: q, answer: a};
		});
	})
	.then(quiz => {
		return models.quiz.create(quiz);
	})
	.then((quiz) => {
		log(` ${colorize('Se ha añadido', 'magenta')}: ${question} ${colorize('=>', 'magenta')} ${answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog('El quiz es erroneo:');
		error.errors.forEach(({message}) => errorlog(message));
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};




/**
 * Borra un quiz del modelo.
 * @param id Clave del quiz a borrar en el modelo.
 * @param rl Objeto readline usado para implementar CLI.
 */
exports.deleteCmd = (rl, id) => {

	validateId(id)
	.then(id => models.quiz.destroy({where: {id}}))
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};


/**
 * Edita un quiz del modelo.
 * @param id Clave del quiz a editar en el modelo.
 * @param rl Objeto readline usado para implementar CLI.
 */
exports.editCmd = (rl, id) => {
	
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id=${id}.`);
		}
		
		process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
        return makeQuestion(rl, ' Introduzca la pregunta: ')
        .then(q => {
        	process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
        return makeQuestion(rl, ' Introduzca la respuesta: ')
        .then(a => {
        	quiz.question = q;
        	quiz.answer = a;
        	return quiz;
        });
        
        });
	})
	.then(quiz => {
		return quiz.save();
	})
	.then(quiz => {
		log(` Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${question} ${colorize('=>', 'magenta')} ${answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog('El quiz es erroneo:');
		error.errors.forEach(({message}) => errorlog(message));
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};
	

/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 * @param id Clave del quiz a probar.
 * @param rl Objeto readline usado para implementar CLI.
 */
exports.testCmd = (rl, id) => {

	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id=${id}`);
		}

			let pregunta = quiz.question.toString();
			makeQuestion(rl, pregunta + '? ')
			.then(a => {
				let respuesta = a.toLowerCase().trim();
				let res = quiz.answer.toLowerCase().trim();
				if (respuesta === res) {
					log(`Su respuesta es correcta. `);
					biglog('Correcta', 'green');
					rl.prompt();
				} else {
					log(`Su respuesta es incorrecta. `);
					biglog('Incorrecta', 'red');
					rl.prompt();
				}

			})
		})
		.catch(error => {
			errorlog(error.message);
		})
		.then(() => {
			rl.prompt();
		});
	
};

		
/**
 * Pregunta todos lo quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 * 
 * @param rl Objeto readline usado para implementar CLI.
 */
exports.playCmd = rl => {
	var score = 0;
	var toBeResolved = [];
	var cuenta = 1;
	models.quiz.findAll()
	.each(quiz => {
		toBeResolved[cuenta-1] = cuenta;
		cuenta++;
	})
	.then(() => {	
	const playOne = () => {
		if (toBeResolved.length === 0) {
			log(`No hay nada más que preguntar.`);
			log(`Fin del juego. Aciertos: ${score}`);
			biglog(score, 'magenta');
			rl.prompt();
		} else {
			try {
				let ale = (cuenta-1)*Math.random();
				let id = ale.toFixed(0);
				let posicion = toBeResolved.indexOf(parseInt(id));
				if (posicion !== -1) {
					toBeResolved.splice(posicion,1);
					validateId(id)
					.then(id => models.quiz.findById(id))
					.then(quiz => {
						if (!quiz) {
							throw new Error(`No existe un quiz asociado al id=${id}`);
						}
						let pregunta = quiz.question.toString();
						makeQuestion(rl, pregunta + '? ')
						.then(a => {
							let respuesta = a.toLowerCase().trim();
							let res = quiz.answer.toLowerCase().trim();
							if (respuesta === res) {
								score ++;
								log(`CORRECTO - Lleva ${score} aciertos.`)
								playOne();
							} else {
								log(`INCORRECTO.`);
								log(`Fin del juego. Aciertos: ${score}`);
								biglog(score, 'magenta');
								rl.prompt();
							}
						})
					})
				} else {
					playOne();
				}
			} catch (error) {
				errorlog(error.message);
				rl.prompt();
			}
		}
	}
	playOne();
	});

};
	/*
	const playOne = () => {
		if (toBeResolved.length === 0) {
			log(`No hay nada más que preguntar.`);
			log(`Fin del juego. Aciertos: ${score}`);
			biglog(score, 'magenta');
			rl.prompt();
		} else {
			try {
				let ale = (i-1)*Math.random();
				let id = ale.toFixed(0);
				let posicion = toBeResolved.indexOf(parseInt(id));
				if (posicion !== -1) {
					let quiz = model.getByIndex(id);
					toBeResolved.splice(posicion,1);
					let pregunta = quiz.question.toString();
					rl.question(colorize(pregunta + '? ', 'red'), answer => {
						let respuesta = answer.toLowerCase().trim();
						let res = quiz.answer.toLowerCase().trim();
						if (respuesta === res){
							score ++;
							log(`CORRECTO - Lleva ${score} aciertos.`)
							playOne();
						} else {
							log(`INCORRECTO.`);
							log(`Fin del juego. Aciertos: ${score}`);
							biglog(score, 'magenta');
							rl.prompt();
						}

				});
				} else {
					playOne();
				}
			} catch (error) {
				errorlog(error.message);
				rl.prompt();
			}
		}
	}
	playOne();



/**
 * Muestra los nombres de los autores de la práctica.
 * 
 * @param rl Objeto readline usado para implementar CLI.
 */
exports.creditsCmd = rl => {
	log("Autores de la práctica:");
	log("Gonzalo Moreno Arévalo", 'green');
	log("Victor Loureiro Sancho", 'green');
	
	rl.prompt();
};


/**
 * Terminar el programa.
 * 
 * @param rl Objeto readline usado para implementar CLI.
 */
exports.quitCmd = rl => {
	rl.close();
};




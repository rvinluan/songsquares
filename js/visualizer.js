var visualizer = {};

visualizer.init = function(soundObjects) {	
	visualizer.canvas = document.getElementById('canvas');
	visualizer.processingInstance = new Processing(visualizer.canvas, visualizer.handleProcessing);
	visualizer.soundObjects = soundObjects;
	visualizer.gridSize = 40;
	visualizer.gridNumber = 25;
	visualizer.gridStart = {
		x: 960/2,
		y: 300 - (Math.sqrt(2 * Math.pow((visualizer.gridSize/2)*visualizer.gridNumber, 2))/2)
	};
	visualizer.regions = {
		'a': {
			x: 4,
			y: 12
		},
		's': {
			x: 6,
			y: 12
		},
		'd': {
			x: 8,
			y: 12
		},
		'f': {
			x: 10,
			y: 12
		},
		'g': {
			x: 12,
			y: 12
		},
		'h': {
			x: 12,
			y: 10
		},
		'j': {
			x: 12,
			y: 8
		},
		'k': {
			x: 12,
			y: 6
		},
		'l': {
			x: 12,
			y: 4
		}
	};
	visualizer.activeRegion = 'asdfghjkl';
}

visualizer.handleProcessing = function(p) {
	p.setup = function() {
		p.size(960,600);
		p.background(255);
		p.colorMode(p.HSB);
	}

	//this function exists because I found a bug in Processing.js's use of
	//shearX and screenX. This function generates tests to clearly show the error.
	//it's never used in the program, but I thought keeping it around might be useful.
	p.testShearScreenX = function() {
		p.pushMatrix();
		p.fill(255);//white
		p.rect(100,100,50,50);
		console.log('normal:'+p.screenX(100,100));
		//logs 100 -- correct

		p.translate(50,50);
		p.fill(255,0,0); //red
		p.rect(100,100,50,50);
		console.log('after translate of 50,50:'+p.screenX(100,100));
		//logs 150 -- correct

		p.rotate(p.PI/6);
		p.fill(0,255,0); //green
		p.rect(100,100,50,50);
		console.log('after rotate of 30 degrees:'+p.screenX(100,100));
		//logs 86.6 -- correct

		p.shearX(-p.PI/6);
		p.fill(0,0,255); //blue
		p.rect(100,100,50,50);
		console.log('afer shear of -30 degrees:'+p.screenX(100,100));
		//logs 166.33 -- incorrect

		p.popMatrix();
	}

	p.draw = function() {
		p.background(255);

		/* draw the grid */
		p.ssr(function() {
			var sx = visualizer.gridSize, sy = sx;
			for (var regionLetter in visualizer.regions) {
				var reg = visualizer.regions[regionLetter];
				if(visualizer.activeRegion.indexOf(regionLetter) !== -1) {
					//region is active
					p.noStroke();
					p.fill(110,240,200,100);
					p.rect((reg.x * visualizer.gridSize) - 10, (reg.y * visualizer.gridSize) - 10,
						visualizer.gridSize + 20, visualizer.gridSize + 20);
				} else {
					//region is inactive
					p.noStroke();
					p.fill(241,240,220,100);
					p.rect((reg.x * visualizer.gridSize) - 10, (reg.y * visualizer.gridSize) - 10,
						visualizer.gridSize + 20, visualizer.gridSize + 20);
				}
			};
			//draw the grid dots
			for(var i = 0; i < visualizer.gridNumber+1; i++) {
				for(var j = 0; j < visualizer.gridNumber+1; j++) {
					p.fill(0);
					p.noStroke();
					p.ellipse(i*visualizer.gridSize,j*visualizer.gridSize,2,2);
				}
			}
		});
		if(soundObjects) {
			//p.renderSoundObject(MetronomeSoundObject);
			for(var i = 0; i < soundObjects.length; i++) {
				p.renderSoundObject(soundObjects[i]);
			}
		}
	}

	/* given a function to draw a shape, 
	* draws it isometrically aligned to the grid
	*/
	p.ssr = function(shape) {
			p.pushMatrix();
			p.translate(visualizer.gridStart.x, visualizer.gridStart.y);
			//p.translate(p.width/2, -p.height/2);
			p.scale(1, 0.5);
			p.rotate(p.radians(45));
			//p.shearX(p.radians(27.5));
			shape.call();
			p.popMatrix();
	}

	/* given grid coordinates and a function to draw a shape,
	* draws the shape aligned to the grid but NOT in isometric.
	* the function should draw the object at 0, 0. 
	*/
	p.ssrAt = function(shape, xcord, ycord) {
		p.ssr(function(){
			p.pushMatrix();
			p.translate(xcord, ycord);
			p.pushMatrix();
			//p.shearX(p.radians(-27.5));
			p.rotate(p.radians(-45));
			p.scale(1, 2);
			shape.call();		
			p.popMatrix();
			p.popMatrix();
		});		
	}

	/* calculates which isometric tile the mouse currently sits on. */
	p.findGrid = function() {
		var grid_x = 960/17,
			grid_y = grid_x / 2,
			xOff = -grid_x / 2,
			yOff = 3,
			virtualX = (p.mouseX) / grid_x,
			virtualY = (p.mouseY + yOff) / grid_y,
			isox, isoy;

		isox = Math.round((virtualY + 2) + (virtualX - 8)) - 1;
		isoy = Math.round((virtualY + 2) - (virtualX - 8));

		isox = p.constrain(isox, 0, 25);
		isoy = p.constrain(isoy, 0, 25);

		//indicator
		/*
		p.ssr(function(){
			p.fill(255,0,0,150);
			p.rect(isox*visualizer.gridSize, isoy*visualizer.gridSize, 40, 40);
		})
		*/

		return {
			x: isox,
			y: isoy
		}
	}

	//draw a hexagon
	p.hex = function(x, y, r) {
		var k = Math.sqrt((3/4)*r*r);
		p.pushMatrix();
		p.translate(x, y);
		p.beginShape();
		p.vertex(0, r);
		p.vertex(k, r/2);
		p.vertex(k, -r/2);
		p.vertex(0, -r);
		p.vertex(-k, -r/2);
		p.vertex(-k, r/2);
		p.endShape(p.CLOSE);
		p.popMatrix();
	}

	p.shadedCube = function(x, y, r, color) {
		var k = Math.sqrt((3/4)*r*r);
		p.colorMode(p.HSB);
		p.pushMatrix();
		p.translate(x, y);
		p.fill(color.h, color.s, color.b);
		p.beginShape();
		p.vertex(0,0);
		p.vertex(-k, -r/2);
		p.vertex(0,-r);
		p.vertex(k, -r/2);
		p.endShape(p.CLOSE);
		p.fill(color.h, color.s, color.b+20);
		p.beginShape();
		p.vertex(0,0);
		p.vertex(k, -r/2);
		p.vertex(k,r/2);
		p.vertex(0, r);
		p.endShape(p.CLOSE);
		p.fill(color.h, color.s, color.b-20);
		p.beginShape();
		p.vertex(0,0);
		p.vertex(0, r);
		p.vertex(-k, r/2);
		p.vertex(-k, -r/2);
		p.endShape(p.CLOSE);
		p.popMatrix();
	}

	p.renderSoundObject = function(soundobject) {
		var xpos, ypos,
			quarterTime,
			elapsed, along, sizeOfHalo;

		/* draw the cube */
		xpos = (soundobject.position.x * visualizer.gridSize);
		ypos = (soundobject.position.y * visualizer.gridSize);
		if(soundobject.beingDragged) {
			var isoCoords = p.findGrid();
			xpos = ((isoCoords.x) * visualizer.gridSize);
			ypos = ((isoCoords.y) * visualizer.gridSize);
			soundobject.position.x = isoCoords.x;
			soundobject.position.y = isoCoords.y;
			if(soundobject.stacked) {
				var stkpos = soundobject.stack.sos.indexOf(soundobject.id);
				for (var i = stkpos; i < soundobject.stack.sos.length; i++) {
					var stkdist = i - stkpos;
					soundObjectByID(soundobject.stack.sos[i]).position.x = soundobject.position.x - stkdist;
					soundObjectByID(soundobject.stack.sos[i]).position.y = soundobject.position.y - stkdist;
				}
			}
		}
		p.ssrAt(function(){
			p.noStroke();
			p.colorMode(p.HSB);
			p.fill(soundobject.color.h, soundobject.color.s, soundobject.color.b);
			p.shadedCube(soundobject.offset.x,soundobject.offset.y, soundobject.size, soundobject.color);
		}, xpos, ypos);

		/* draw halo according to present time */
		if(soundobject.gain.gain.value === 0) {
			return;
		}
		elapsed = (new Date().getTime()) - soundobject.startedPlaying;
		along = (elapsed/1000) / soundobject.sound.getDuration(); //percentage
		sizeOfHalo = soundobject.size + (along * (500));
		p.ssrAt(function() {
			p.noFill();
			p.strokeWeight(2);
			p.stroke(soundobject.color.h, soundobject.color.s, soundobject.color.b, 255*(1-along));
			p.hex(0,0,sizeOfHalo);
		}, xpos, ypos);
	}

	/* checks if a screen coordinate is inside a SoundObject.
	* this is used for mouse interaction
	*/
	p.isInside = function(so, x, y) {
		var xs, ys, ax, ay;

		p.pushMatrix();
		p.translate(visualizer.gridStart.x, visualizer.gridStart.y);
		p.scale(1, 0.5);
		p.rotate(p.radians(45));
		p.translate(so.position.x * visualizer.gridSize,
				so.position.y * visualizer.gridSize);
		ax = p.screenX(0,0);
		ay = p.screenY(0,0);
		p.popMatrix();

		xs = x - (ax);
		xs = xs * xs;

		ys = y - (ay);
		ys = ys * ys;

		return Math.sqrt(xs + ys) <= (so.size);		
	}

	/* given grid coordinates, determines if there is a soundObject there. */
	p.soundObjectAt = function(px, py) {
		for (var i = 0; i < soundObjects.length; i++) {
			if(soundObjects[i].position.x === px &&
				soundObjects[i].position.y === py) {
				return soundObjects[i];
			}
		};
		return null;
	}

	/* given an id, finds the corresponding sound object. */
	//p.soundObjectByID = function(id) {}

	/* this function takes an array index, not a soundObject */
	p.bringToFront = function(whichSO) {
		var so = soundObjects.splice(whichSO, 1);
		soundObjects.push(so[0]);
	}

	/* makes sure the blocks on top of this block are in front of it */
	p.stackProperly = function(so) {
		if(so.stacked) {
			var above = p.soundObjectAt(so.position.x - 1, so.position.y - 1);
			if(above) {
				p.bringToFront(soundObjects.indexOf(above));
				p.stackProperly(above);
			}
		}
	}

	p.mousePressed = function() {
		for(var i = soundObjects.length - 1; i >= 0; i--) {
			if(p.isInside(soundObjects[i], p.mouseX, p.mouseY)) {
				var so = soundObjects[i];
				p.bringToFront(i);
				so.beingDragged = true;
				p.stackProperly(so);
				break;
			}
		}
	}

	p.mouseReleased = function() {
		var isoCoords = p.findGrid();
		var so, below, stk;
		for(var i = 0; i < soundObjects.length; i++) {
			so = soundObjects[i];
			if(so.beingDragged) {
				so.beingDragged = false;
				so.position.x = isoCoords.x;
				so.position.y = isoCoords.y;
				if(so.position.x == 25 || so.position.y == 25) {
					//delete!
					soundObjects.splice(i, 1);
					return;
				}
				below = p.soundObjectAt(so.position.x + 1, so.position.y + 1);
				if(below) {
					/* WARNING: Crazy Stacking Logic Ahead */
					//I should probably move this logic somewhere else.
					if(!below.stacked) {
						if(!so.stacked) {
							//block on block:
							//make a new stack, add both blocks.
							stk = new SoundObjectStack();
							below.addToStack(stk);
							so.addToStack(stk);
							stacks.push(stk);
						} else {
							//stack on block:
							//remove everything from this block and above.
							var oldStack = so.stack;
							var newStack = new SoundObjectStack();
							newStack.sos = so.stack.sos.splice(so.stack.sos.indexOf(so.id));
							//update so that these blocks now point to their new stack
							for(i in newStack.sos) {
								soundObjectByID(newStack.sos[i]).stack = newStack;
							}
							//add the block below to the bottom of this new stack
							below.addToStack(newStack, 0);
							//if there are less than 2 blocks left on the old stack,
							//they're not a stack anymore.
							if(oldStack.sos.length <= 1) {
								if(oldStack.sos[0] !==  undefined) {
									//1 object left
									var leftover = soundObjectByID(oldStack.sos[0]);
									leftover.stacked = false;
									leftover.stack = null;
								} else {
									//no objects left
									stacks.splice(stacks.indexOf(oldStack), 1);
								}
							}

						}
					} else {
						if(!so.stacked) {
							//block on stack
							so.addToStack(below.stack);
						} else {
							//stack on stack
							var oldStack = so.stack;
							var newStack = below.stack;
							//add all the things from this block and above.
							Array.prototype.push.apply(newStack.sos, oldStack.sos.splice(oldStack.sos.indexOf(so.id)));
							//make sure all these blocks point to the new array.
							for(i in newStack.sos) {
								soundObjectByID(newStack.sos[i]).stack = newStack;
							}
							//if there are less than 2 blocks left on the old stack,
							//they're not a stack anymore.
							if(oldStack.sos.length <= 1) {
								if(oldStack.sos[0] !==  undefined) {
									//1 object left
									var leftover = soundObjectByID(oldStack.sos[0]);
									leftover.stacked = false;
									leftover.stack = null;
								} else {
									//no objects left
									stacks.splice(stacks.indexOf(oldStack), 1);
								}
							}
						}
					}
				} else {
					if(so.stacked) {
						//stack on nothing:
						//remove everything from this block and above.
						var oldStack = so.stack;
						var newStack = new SoundObjectStack();
						newStack.sos = so.stack.sos.splice(so.stack.sos.indexOf(so.id));
						//update so that these blocks now point to their new stack
						for(i in newStack.sos) {
							soundObjectByID(newStack.sos[i]).stack = newStack;
						}
						//if there are less than 2 blocks left on the old stack,
						//they're not a stack anymore.
						if(oldStack.sos.length <= 1) {
							if(oldStack.sos[0] !==  undefined) {
								//1 object left
								var leftover = soundObjectByID(oldStack.sos[0]);
								leftover.stacked = false;
								leftover.stack = null;
							} else {
								//no objects left
								stacks.splice(stacks.indexOf(oldStack), 1);
							}
						}
					}
				}				
			}
		}
	}
}
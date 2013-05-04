var visualizer = {};

visualizer.init = function(soundObjects) {	
	visualizer.canvas = document.getElementById('canvas');
	visualizer.ctx  = visualizer.canvas.getContext('2d');
	visualizer.processingInstance = new Processing(visualizer.canvas, visualizer.handleProcessing);
	visualizer.soundObjects = soundObjects;
	visualizer.currentWaveform = null;
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

		if(visualizer.currentWaveform != null) {
			p.visualizeWaveform(visualizer.currentWaveform);
		}
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

	p.visualizeWaveform = function(PCMData) {
		p.background(255,255,255);
		p.stroke(100,100,100);
		p.noFill();
		for(var i = 0; i < PCMData.length; i++) {
			if(1) {
				p.line(i/2, 250 + (PCMData[i] * 50), (i+1)/2, 250 + (PCMData[i+1]*50));
			}
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

	p.softRectangle = function(x, y, r, color) {
		for(var i = r + 40; i > r; i--) {
			p.fill(color.r, color.g, color.b, 255/40);
			p.rectMode(p.CENTER);
			p.rect(x + r/2, y + r/2, i, i);
			p.rectMode(p.CORNER);
		}
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
				var stkpos = soundobject.stack.sos.indexOf(soundobject);
				for (var i = stkpos; i < soundobject.stack.sos.length; i++) {
					var stkdist = i - stkpos;
					soundobject.stack.sos[i].position.x = soundobject.position.x - stkdist;
					soundobject.stack.sos[i].position.y = soundobject.position.y - stkdist;
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

	p.soundObjectAt = function(px, py) {
		for (var i = 0; i < soundObjects.length; i++) {
			if(soundObjects[i].position.x === px &&
				soundObjects[i].position.y === py) {
				return soundObjects[i];
			}
		};
		return null;
	}

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
					//stackzzzz
					if(!below.stacked) {
						if(!so.stacked) {
							//block on block
							stk = new SoundObjectStack();
							stk.sos.push(below);
							stk.sos.push(so);
							below.stack = stk;
							below.stacked = true;
							so.stack = stk;
							so.stacked = true;
							stacks.push(stk);
						} else {
							//stack on block
							var oldstk = so.stack;
							var index = oldstk.sos.indexOf(so);
							var newsos = oldstk.sos.splice(index);
							newsos.splice(0,0,below);
							var newstk = new SoundObjectStack();
							below.stacked = true;
							below.stack = newstk;
							so.stack = newstk;
							newstk.sos = newsos;
							stacks.push(newstk);
							if(oldstk.sos.length <= 1) {
								if(oldstk.sos[0] !== undefined) {
									oldstk.sos[0].stacked = false;
									oldstk.sos[0].stack = null;
								}
								stacks.splice(stacks.indexOf(oldstk), 1);
							}
						}
					} else {
						if(!so.stacked) {
							//block on stack
							stk = below.stack;
							so.stacked = true;
							so.stack = stk;
							stk.sos.push(so);
						} else {
							//stack on stack
							var newstk = below.stack;
							var oldstk = so.stack;
							var index = so.stack.sos.indexOf(so);
							for (var i = index; i < oldstk.sos.length; i++) {
								var current = oldstk.sos[i];
								current.stack = newstk;
								newstk.sos.push(current);
							};
							oldstk.sos.splice(index);
							if(oldstk.sos.length <= 1) {
								if(oldstk.sos[0] !== undefined) {
									oldstk.sos[0].stacked = false;
									oldstk.sos[0].stack = null;
								}
								stacks.splice(stacks.indexOf(oldstk), 1);
							}
						}
					}
				} else {
					if(so.stacked) {
						var oldstk = so.stack;
						var newsos = oldstk.sos.splice(oldstk.sos.indexOf(so));
						if(newsos.length === 1) {
							so.stacked = false;
							so.stack = null;
						}
						var newstk = new SoundObjectStack();
						for (var i = 0; i < newsos.length; i++) {
							newsos[i].stack = newstk;
						};
						newstk.sos = newsos;
						stacks.push(newstk);
						if(oldstk.sos.length <= 1) {
							//not a stack anymore.
							if(oldstk.sos[0] !== undefined) {
								oldstk.sos[0].stacked = false;
								oldstk.sos[0].stack = null;
							}
							stacks.splice(stacks.indexOf(oldstk), 1);
						}
					}
				}				
			}
		}
	}
}

visualizer.draw = function() {
	var ctx = visualizer.ctx;

	ctx.fillStyle = "rgb(200,0,0)";
	ctx.fillRect (10, 10, 55, 50);
 
	ctx.fillStyle = "rgba(0, 0, 200, 0.5)";
	ctx.fillRect (30, 30, 55, 50);
}

visualizer.drawFrame = function(PCMData) {
	//PCMData is a Float32Array.
	var ctx = visualizer.ctx;

	//clear the background.
	ctx.clearRect(0,0,500,500);
	ctx.strokeStyle = "#888888";

	ctx.beginPath();
	ctx.moveTo(0,250);
	for(var i = 0; i < PCMData.length; i++) {
		if(i%12 == 0) {
			ctx.lineTo( i / 2, 250 + (PCMData[i] * 50) );
		}
	}
	ctx.stroke();
}

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.canvas.width = window.innerWidth - 30;
        this.canvas.height = window.innerHeight - 30;
        this.gl = canvas.getContext('webgl2');
        this.programs = {};
        this.vertexBuffer = null;
        this.uvBuffer = null;
        this.matrixStack = [];
        this.textures = {};
        this.activeProgram = {};
        window.onresize = (d) => {
            this.canvas.width = window.innerWidth - 30;
            this.canvas.height = window.innerHeight - 30;
        }
    }
    
    async getShader(url, type) {
        let shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, await (await fetch(url)).text())
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.log(this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    async initProgram(name, vertexUrl, fragmentUrl) {
        let vertex = await this.getShader(vertexUrl, this.gl.VERTEX_SHADER);
        let fragment = await this.getShader(fragmentUrl, this.gl.FRAGMENT_SHADER);
        if (!vertex || !fragment) {
            console.log(`Problems with program's shaders (${name})`);
            return;
        }
        let program = this.gl.createProgram();
        this.gl.attachShader(program, vertex);
        this.gl.attachShader(program, fragment);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.log(this.gl.getProgramInfoLog(program));
            return;
        }
        this.programs[name] = {
            program,
            attributes: {
                aPosition: this.gl.getAttribLocation(program, 'aPosition'),
                aUV: this.gl.getAttribLocation(program, 'aUV'),
            },
            uniform: {
                uView: this.gl.getUniformLocation(program, 'uView'),
                uMatrix: this.gl.getUniformLocation(program, 'uMatrix'),
                uTexture: this.gl.getUniformLocation(program, 'uTexture'),
                uColor: this.gl.getUniformLocation(program, 'uColor'),
            },
        }
    }


    async init() {
        await this.initProgram('unlit', 'game/shaders/vunlit.glsl', 'game/shaders/funlit.glsl');
        this.vertexBuffer = this.gl.createBuffer();
        this.uvBuffer = this.gl.createBuffer();
    }

    clear() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.enable(this.gl.BLEND);
    }

    viewMatrix() {
        return new Float32Array([
            1 / this.canvas.width * 2, 0, 0, 0,
            0, 1 / this.canvas.height * 2, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);
    }

    useProgram(name) {
        this.activeProgram = this.programs[name];
        this.gl.useProgram(this.programs[name].program);
        if (this.programs[name].uniform.uView) {
            this.gl.uniformMatrix4fv(this.programs[name].uniform.uView, false, this.viewMatrix());
        }
        if (this.programs[name].uniform.uMatrix) {
            this.gl.uniformMatrix4fv(this.programs[name].uniform.uMatrix, false, this.matrix());
        }
        if (this.programs[name].uniform.uTexture) {
            this.gl.uniform1i(this.programs[name].uniform.uTexture, 0);
        }
    }

    rectBufferData(x, y, w, h) {
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            x, y + h,
            x + w, y + h,
            x + w, y,
            x, y + h,
            x + w, y,
            x, y,
        ]), this.gl.DYNAMIC_DRAW);
    }
    
    drawAsRect(x, y, w, h, ux, uy, uw, uh) {
        if (this.activeProgram.attributes.aPosition >= 0) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
            this.gl.enableVertexAttribArray(this.activeProgram.attributes.aPosition);
            this.rectBufferData(x, y, w, h);
            this.gl.vertexAttribPointer(this.activeProgram.attributes.aPosition, 2, this.gl.FLOAT, false, 0, 0);
        }
        if (this.activeProgram.attributes.aUV >= 0) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uvBuffer);
            this.gl.enableVertexAttribArray(this.activeProgram.attributes.aUV);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
                ux, uy + uh,
                ux + uw, uy + uh,
                ux + uw, uy,
                ux, uy + uh,
                ux + uw, uy,
                ux, uy,
            ]), this.gl.DYNAMIC_DRAW);
            this.gl.vertexAttribPointer(this.activeProgram.attributes.aUV, 2, this.gl.FLOAT, false, 0, 0);
        }
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    matrix() {
        return this.matrixStack[this.matrixStack.length - 1];
    }

    translate(x, y) {
        this.matrix()[12] += x; 
        this.matrix()[13] += y; 
    }

    pushMatrix() {
        if (this.matrixStack.length == 0) {
            this.matrixStack.push(new Float32Array([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ]));
        } else {
            this.matrixStack.push(new Float32Array(this.matrixStack[this.matrixStack.length - 1]));
        }
    }

    popMatrix() {
        this.matrixStack.pop();
    }

    loadImage(url) {
        let image = new Image();
        let promise = new Promise(resolve => {image.onload = () => {resolve(image);}});
        image.src = url;
        return promise;
    }

    async loadTexture(name, url) {
        let image = await this.loadImage(url);
        let texture = this.gl.createTexture()
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.textures[name] = texture;
    }

    bindTexture(name) {
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[name]);
    }
}

class Player {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
        this.ex = 0;
        this.ey = 0;
        this.time = 0;
        this.duration = 1;
        this.layers = [[1, 0, 0], [1, 1, 0]]
    }
    
    distance() {
        return Math.sqrt((this.ex - this.x) * (this.ex - this.x) + (this.ey - this.y) * (this.ey - this.y));
    }

    move(ex, ey) {
        this.ex = ex;
        this.ey = ey;
        this.time = this.game.time;
        this.duration = this.distance() ;
    }

    lerp(start, end, amt){
        return (1-Math.min(Math.max(amt, 0), 1))*start+Math.min(Math.max(amt, 0), 1)*end;
    }

    tp() {
        this.x = this.lerp(this.x, this.ex, (this.game.time - this.time) / this.duration / 200);
        this.y = this.lerp(this.y, this.ey, (this.game.time - this.time) / this.duration / 200);
        this.layers[1][0] = this.x / (this.game.renderer.canvas.width / 2 );
        this.layers[0][1] = this.y / (this.game.renderer.canvas.height / 2 );
    }

    render() {
        this.tp();
        this.game.renderer.pushMatrix();
        this.game.renderer.translate(this.x, this.y);
        this.game.renderer.useProgram('unlit');
        this.game.renderer.bindTexture('player');
        this.game.renderer.gl.uniform3fv(this.game.renderer.activeProgram.uniform.uColor, this.layers[0]);
        this.game.renderer.drawAsRect(-32, -32, 64, 64, 0, 0, 0.5, 1);
        this.game.renderer.gl.uniform3fv(this.game.renderer.activeProgram.uniform.uColor, this.layers[1]);
        this.game.renderer.drawAsRect(-32, -32, 64, 64, 0.5, 0, 0.5, 1);
        this.game.renderer.popMatrix();
    }
}

class Game {
    constructor(params) {
        this.renderer = new Renderer(params.canvas);
        this.time = 0;
        this.delta = 0;
    }

    async init() {
        await this.renderer.init();
        await this.renderer.loadTexture('player', 'game/images/player.png');
        document.body.addEventListener('click', (e) => {
            this.player.move(e.x - e.target.width / 2, -(e.y - e.target.height / 2));
        });
    }

    async run() {
        await this.init();
        this.player = new Player(this);
        this.render();
    }

    render() {
        this.renderer.clear();
        this.player.render();
        requestAnimationFrame((d) => {
            this.delta = (d - this.time)/ 1000;
            this.time = d;
            this.render();
        });
    }
}
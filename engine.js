let gl = document.querySelector('#canvas').getContext('webgl', { preserveDrawingBuffer : true });

class Program {
    constructor(vertexId, fragmentId) {
        let vertexSource = document.querySelector(vertexId).firstChild.nodeValue;
        let fragmentSource = document.querySelector(fragmentId).firstChild.nodeValue;
        let vertex = this.compile(vertexSource, gl.VERTEX_SHADER);
        let fragment = this.compile(fragmentSource, gl.FRAGMENT_SHADER);
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertex);
        gl.attachShader(this.program, fragment);
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.log("Error linking shader program:");
            console.log(gl.getProgramInfoLog(program));
        }
    }

    compile(source, type) {
        let shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(shader));
            console.error('I CAN\'T COMPILE');
        }
        return shader;
    }
}

let defaultProgram = new Program('#vshader', '#fshader');
let vertexArray = new Float32Array([
    -0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
    -0.5, 0.5, 0.5, -0.5, -0.5, -0.5,
]);
let uv = new Float32Array([
    0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0
]);

let image = new Image();

let frame = () => {
    let angle = 0;
    let rotationMatrix = [
        Math.cos(angle), -Math.sin(angle),
        Math.sin(angle), Math.cos(angle),
    ]
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
    let uvVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,  gl.UNSIGNED_BYTE, image);
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    let render = (d) => {
        gl.viewport(0, 0, 720, 720);
        gl.clearColor(0.8, 0.9, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(defaultProgram.program);
        let uRotation = gl.getUniformLocation(defaultProgram.program, 'uRotation');
        gl.uniformMatrix2fv(uRotation, false, rotationMatrix);

        let aVertexPosition = gl.getAttribLocation(defaultProgram.program, "vPosition");
        let aUV = gl.getAttribLocation(defaultProgram.program, "vTexCoord");
        
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.enableVertexAttribArray(aVertexPosition);
        gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0,);

        gl.bindBuffer(gl.ARRAY_BUFFER, uvVertexBuffer);
        gl.enableVertexAttribArray(aUV);
        gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0,);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(defaultProgram.program, 'uSampler'), 0);
        gl.uniform1f(gl.getUniformLocation(defaultProgram.program, 'uTime'), Math.cos(d / 1000));


        gl.drawArrays(gl.TRIANGLES, 0, vertexArray.length / 2);
        requestAnimationFrame(render);
        angle += Math.abs(Math.cos(d / 1000) * 0.005);
        rotationMatrix = [
            Math.cos(angle), -Math.sin(angle),
            Math.sin(angle), Math.cos(angle),
        ]
    }
    render(0);
}

image.src = 'meow.png';

image.onload = () => {
    frame();
}
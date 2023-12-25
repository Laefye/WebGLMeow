attribute vec4 aPosition;
attribute vec2 aUV;

uniform mat4 uView;
uniform mat4 uMatrix;

varying vec2 vUV;

void main() {
    gl_Position = uView * uMatrix * aPosition;
    vUV = aUV;
}
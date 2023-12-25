uniform sampler2D uTexture;
uniform mediump vec3 uColor;

varying highp vec2 vUV;

void main() {
    gl_FragColor = texture2D(uTexture, vUV);
    gl_FragColor.x *= uColor.x;
    gl_FragColor.y *= uColor.y;
    gl_FragColor.z *= uColor.z;
}
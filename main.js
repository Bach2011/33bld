import "https://cdn.cubing.net/v0/js/cubing/twisty";
import srScrambler from "https://esm.sh/sr-scrambler@2.0.2";

const cube = document.querySelector("#cube");

function changeScramble(len) {
  const scramble = srScrambler.cube(3, len);
  document.querySelector(".scramble").innerText = scramble;

  cube.setAttribute("alg", scramble);   // load the scramble
  cube.jumpToEnd();                     // show the cube already scrambled
}

changeScramble(20);

document.querySelector(".changeScr").addEventListener("click", () => {
  changeScramble(20);
});
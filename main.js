import "https://cdn.cubing.net/v0/js/cubing/twisty";
import srScrambler from "https://esm.sh/sr-scrambler@2.0.2";
import { opMemo } from "./memo.js";

const cube = document.querySelector("#cube");
const scrambleElement = document.querySelector(".scramble");
const memoElement = document.querySelector(".memo");
const edgeMemo = document.querySelector("#edge-memo");
const cornerMemo = document.querySelector("#corner-memo");
const parityMemo = document.querySelector("#parity-memo");
const edgeInput = document.querySelector("#edge-input");
const cornerInput = document.querySelector("#corner-input");

let timing = false;
let inspecting = false;
let keyTimer;
let countTimer;
const timeElement = document.querySelector(".time");

function changeScramble(len) {
  const scramble = srScrambler.cube(3, len);
  scrambleElement.innerText = scramble;
  cube.setAttribute("alg", scramble);   // load the scramble
  cube.jumpToEnd();
  
  const memo = opMemo(scramble);// show the cube already scrambled
  edgeMemo.innerText = memo.text.edges;
    cornerMemo.innerText = memo.text.corners;
    if(memo.parity) parityMemo.innerText = "Yes";
    else parityMemo.innerText = "No";
  edgeInput.value = "";
  cornerInput.value = "";
    
}

changeScramble(20);

document.querySelector(".changeScr").addEventListener("click", () => {
  changeScramble(20);
});

const memoBtn = document.querySelector("#memo-btn");
memoBtn.addEventListener("click", () => {
    if(memoElement.style.display === "none") {
        memoElement.style.display = "block";
        memoBtn.innerText = "Hide Hint";
    } else {
        memoElement.style.display = "none";
        memoBtn.innerText = "Show Hint";
    }   
});

function startTimer() {
  timing = true;
  let startTime = Date.now();
  countTimer = setInterval(() => {
    let currentTime = Date.now();
    timeElement.innerText = ((currentTime - startTime) / 1000).toFixed(2);
  }, 10);
}

function stopTimer() {
  timing = false;
  clearInterval(countTimer);
  changeScramble(20);
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    if (!timing) {
      startTimer();
    } else {
      stopTimer();
    }
  }
});
const getTotalChoice = (balance) => {
  let choice = [0, 0, 0]
  choice[0] = Math.floor(balance * 0.5 / 50) * 50
  choice[1] = Math.floor(balance * 0.75 / 50) * 50
  choice[2] = Math.floor(balance / 50) * 50
  return choice.filter((i) => i >= 200)
}

const getSingle = (total) => {
  let choice = [0, 0, 0]
  
  choice[0] = Math.floor(total * 0.1 / 50) * 50
  choice[1] = Math.floor(total * 0.2 / 50) * 50
  choice[2] = Math.floor(total * 0.4 / 50) * 50
  return choice.filter((i) => i >= 50)
}

console.log(getSingle(200))
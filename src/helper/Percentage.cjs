const addition = require(__dirname + "/Addition.cjs");

module.exports.Percentage = function (array_cost, array_names) {
    const percentages = {};
    var total_costs = addition.Addition(array_cost);
    var temp = Number(0);
    
    //check array lengths against eachother
    if (array_cost.length != array_names.length) {
        return null;
    }

    //check if total_costs was successful
    if (total_costs == null) {
        return null;
    }

    //Generate percentages of total cost and place in object
    for (let index = 0; index < array.length; index++) {
        temp = (array_cost[index] / total_costs) * 100;
        Object.defineProperty(percentages, array_names[index], {value:temp});
    }

    //return object
    return percentages;
  }

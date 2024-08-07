//jshint esversion: 6

//Database
const mongoose = require("mongoose");
const url = ""; //replace with your own
mongoose.connect(url);
const projectSchema = new mongoose.Schema({
    name: String,
    value: Number,
    category: String,
    Date: String,
    periodicity: String 
});
const Project = mongoose.model("Entry", projectSchema);

//Helper functions
const addition = require(__dirname + "\\src\\helper\\Addition.cjs");
const validate = require(__dirname + "\\src\\helper\\Validate.cjs");
const percentage = require(__dirname + "\\src\\helper\\Percentage.cjs");
const period = require(__dirname + "\\src\\helper\\Timeperiod.cjs");

//CRUD
const create = require(__dirname + "\\src\\database\\Create.cjs");
const query = require(__dirname + "\\src\\database\\Read.cjs");
const remove = require(__dirname + "\\src\\database\\Delete.cjs");
const update = require(__dirname + "\\src\\database\\Update.cjs");

//general requirements
const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const https = require("https");
const app = express();
const rp = require('request-promise');
const fs = require("fs");
const generateGraph = require("./generateGraph");
const moment = require("moment");

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));

app.set('view engine', 'ejs');

app.get("/", function(req, res) {
    res.render("index")
});

app.get("/enterData", function(req, res) {
    res.render("enterData")
});

app.get("/displayData", async(req, res) => {
    //retrieve database information

    //update all dates to next due date after today
    const allItems = await query.Query(Project);

    for (var i = 0; i<allItems.length; i++) {
        if(allItems[i].Date < Date.now())
        {
            update.Update(Project, {_id: allItems[i]._id}, {Date: period.Period(allItems[i].Date, allItems[i].periodicity)})
        }
    }

    let today = new Date();

    today.setHours(0,0,0,0);

    let todayTimestamp = today.valueOf();

     //let searchQuery = {
         //Date:{ $gte:todayTimestamp},
         //category: "housing"
     //}

    let oneWeek = today.setDate(today.getDate()+7)
    let oneMonth = today.setMonth(today.getMonth()+1)

    let oneWeekTimestamp = oneWeek.valueOf();
    let oneMonthTimestamp = oneMonth.valueOf();

    let searchQuery = {
             //$and:[{Date:{$gte: todayTimestamp}}, {Date:{$lte: oneWeek}}],
             //category: "transportation"
        }

    const databaseEntries = await query.Query(Project,searchQuery);

    //calculate total cost
    const costArray = [];
    for (var i = 0; i<databaseEntries.length; i++) {
        costArray.push(databaseEntries[i].value);
    }
    const total_cost = addition.Addition(costArray);

    let data = databaseEntries.map(item => ({
        Date: item.Date,
        Category: item.category,
        Value: item.value
    }));

    data.forEach(d => console.log(`Raw Date: ${d.Date}`));

    data = data.map(d => {
        const date = moment(Number(d.Date));
        const month = date.format('MMM');
        const year = date.format('YYYY');
        return { ...d, Month: `${month}-${year}` };
    });

    data.forEach(d => console.log(`Parsed Date: ${d.Month}`));

    // Group by month
    const groupedData = data.reduce((acc, curr) => {
        const month = curr.Month;
        if (!acc[month]) acc[month] = 0;
        acc[month] += curr.Value;
        return acc;
    }, {});

    const graphData = Object.keys(groupedData).map(month => ({
        Month: month,
        Value: groupedData[month]
    }));

    generateGraph(graphData);
    
    //render
    res.render("displayData", {total: total_cost, newListItems: databaseEntries})
});

app.post("/", function(req, res) {
    var operation = Number(req.body.boa);

    //Create
    if (operation == 0) {
        console.log("here");

        //retrieve form information
        const frequency = req.body.frequency;
        const amount = Number(req.body.amount);
        const name = req.body.name;
        const category = req.body.category;

        console.log(name);
        console.log(amount);

        //check if everything is entered properly
        if(amount == null) {
            res.redirect("http://localhost:3000/enterData");
        }
        else if (name == null) {
            res.redirect("http://localhost:3000/enterData");
        }
        else {
            //use frequency to determine how often it recurs
            //var nextCharge = period.Period(frequency);
            var nextCharge = "soon";

            //create a new database entry
            create.Create(Project, name, amount, category, frequency);

            res.redirect("http://localhost:3000/enterData");
        }
    }

    //Delete
    else if (operation == 1) {
        const toPurge = req.body.selectedItem;
        console.log(req.body.selectedItem);

        remove.Delete(Project, toPurge);

        res.redirect("http://localhost:3000/displayData");
    }
});

app.post("/filterData", async (req, res) => {
    const { startDate, endDate, category } = req.body;

    const filterCriteria = {
        Date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (category) {
        filterCriteria.category = category;
    }

    const filteredItems = await Project.find(filterCriteria);

    let data = filteredItems.map(item => ({
        Date: item.Date,
        Category: item.category,
        Value: item.value
    }));

    data.forEach(d => console.log(`Raw Date: ${d.Date}`));

    data = data.map(d => {
        const date = moment(Number(d.Date));
        const month = date.format('MMM');
        const year = date.format('YYYY');
        return { ...d, Month: `${month}-${year}` };
    });

    data.forEach(d => console.log(`Parsed Date: ${d.Month}`));

    // Group by month
    const groupedData = data.reduce((acc, curr) => {
        const month = curr.Month;
        if (!acc[month]) acc[month] = 0;
        acc[month] += curr.Value;
        return acc;
    }, {});

    const graphData = Object.keys(groupedData).map(month => ({
        Month: month,
        Value: groupedData[month]
    }));

    generateGraph(graphData);

    res.json({ success: true });
});

app.listen(process.env.PORT || 8000, function(){
    console.log("Server listening on port 3000");
});

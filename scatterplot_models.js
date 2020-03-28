var margin = { top: 10, right: 30, bottom: 30, left: 60 },
    width = 460 - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;

// append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

// Initialize the X axis
var x = d3.scaleLinear()
    .range([0, width])
var xAxis = svg.append("g")
    .attr("transform", "translate(0," + height + ")")
var xAxisLabel = svg.append("text")
    .attr("transform",
        "translate(" + (width / 2) + " ," +
        (height + margin.bottom) + ")")
    .style("text-anchor", "middle")

// Initialize the Y axis
var y = d3.scaleLinear()
    .range([height, 0]);
var yAxis = svg.append("g")
    .attr("class", "myYaxis")
var yAxisLabel = svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")

// Add a tooltip div. Here I define the general feature of the tooltip: stuff that do not depend on the data point.
// Its opacity is set to 0: we don't see it by default.
var tooltip = d3.select("#my_dataviz")
    .append("div2")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "10px")


var boolean_mouseover = false;

function getLabel(label) {
    switch (label) {
        case "Misclass": return "Misclassification";
        case "LogLoss": return "LogLoss";
        case "GOF": return "Goodness of Fit";
        case "Accuracy0": return "Accuracy of Sensitive Predictions";
        case "Accuracy1": return "Accuracy of Resistant Predictions";
        case "MCC": return "| Matthews Correlation Coefficient |";
    }
}

function update(var1, var2) {
    //Read the data
    d3.tsv(globalVariable.data_file, function (data) {

        // Add X axis
        x.domain([0, d3.max(data, function (d) { return +d[var1] }) + 0.05]);
        xAxis.transition().duration(1000).call(d3.axisBottom(x))

        xAxisLabel
            .transition().duration(1000)
            .text(getLabel(var1));

        // Add Y axis
        y.domain([0, d3.max(data, function (d) { return +d[var2] }) + 0.05]);
        yAxis.transition().duration(1000).call(d3.axisLeft(y));

        yAxisLabel
            .transition().duration(1000)
            .text(getLabel(var2));

        // A function that change this tooltip when the user hover a point.
        // Its opacity is set to 1: we can now see it. Plus it set the text and position of tooltip depending on the datapoint (d)
        var mouseover = function (d) {
            tooltip
                .style("opacity", 1)
            d3.select(this).style("fill", "red")
            boolean_mouseover = true;
            mousemove;
        }

        // A function that change this tooltip when the leaves a point: just need to set opacity to 0 again
        var mouseleave = function (d) {
            tooltip
                .transition()
                .duration(200)
                .style("opacity", 0)
            if (boolean_mouseover == true) {
                d3.select(this).style("fill", "#69b3a2");
                boolean_mouseover = false;
            }
        }

        var mousemove = function (d) {
            tooltip
                .html("The genes in this model are: " + d.Genes + "<br>Model: " + d.Set_of_parameters_modelNumber + 
                    "<br>C value: " + d.C_Value + "&nbsp Sigma value: " + d.Sigma_Value +
                    "<br>Misclassification score: " + d.Misclass + "&nbsp Misclassification Error: " + d.Misclass_Error +
                    "<br>LogLoss: " + d.LogLoss + "&nbsp Logloss Error: " + d.LogLoss_Error +
                    "<br>Goodness of fit: " + d.GOF + "&nbsp Goodness of Fit Error: " + d.GOF_Error +
                    "<br>Accuracy of sensitive predictions: " + d.Accuracy0 + "&nbsp Accuracy Error: " + d.Accuracy0_err +
                    "<br>Accuracy of resistant predictions: " + d.Accuracy1 + "&nbsp Accuracy Error: " + d.Accuracy1_err +
                    "<br>MCC: " + d.MCC)
                .style("left", ("500 px")) // It is important to put the +90: other wise the tooltip is exactly where the point is an it creates a weird effect
                .style("top", (d3.event.pageY) + "px")
        }

        // Add dots

        var u = svg.selectAll("circle")
            .data(data.filter(function (d, i) { return i < 100   })) // the .filter part is just to keep a few dots on the chart, not all of them
            //.data(data)
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave)
        u
            .enter()
            .append("circle")
            .merge(u)
            .transition()
            .duration(1000)
            .attr("cx", function (d) { return x(Math.abs(d[var1])); })
            .attr("cy", function (d) { return y(Math.abs(d[var2])); }) //absolute value of y (e.g. if negative MCC)
            .attr("r", 7)
            .style("fill", "#69b3a2")
            .style("opacity", 0.3)
            .style("stroke", "white")
    })

}

update(document.getElementById("Var 1").value, document.getElementById("Var 2").value)
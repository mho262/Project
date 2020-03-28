/*
Developer: Michelle Ho
Program: Plots models across 2 selected performic metrics (i.e. determine model with best MCC and log loss)
         Hovering over data points reveals further information about the model
            Performance metrics:
                Misclassification score
                Log loss
                Matthews Correlation Coefficient
                Goodness of Fit
                Accuracy of resistant predictions
                Accuracy of sensitive predictions

*/

var scatterplot_margin = { top: 10, right: 30, bottom: 30, left: 60 },
    scatterplot_width = 460 - scatterplot_margin.left - scatterplot_margin.right,
    scatterplot_height = 450 - scatterplot_margin.top - scatterplot_margin.bottom;

// append the svg object to the body of the page
var scatterplot_svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", scatterplot_width + scatterplot_margin.left + scatterplot_margin.right)
    .attr("height", scatterplot_height + scatterplot_margin.top + scatterplot_margin.bottom)
    .append("g")
    .attr("transform",
        "translate(" + scatterplot_margin.left + "," + scatterplot_margin.top + ")");

// Initialize the X axis
var scatterplot_x = d3.scaleLinear()
    .range([0, scatterplot_width])
var scatterplot_xAxis = scatterplot_svg.append("g")
    .attr("transform", "translate(0," + scatterplot_height + ")")
var scatterplot_xAxisLabel = scatterplot_svg.append("text")
    .attr("transform",
        "translate(" + (scatterplot_width / 2) + " ," +
        (scatterplot_height + scatterplot_margin.bottom) + ")")
    .style("text-anchor", "middle")

// Initialize the Y axis
var scatterplot_y = d3.scaleLinear()
    .range([scatterplot_height, 0]);
var scatterplot_yAxis = scatterplot_svg.append("g")
    .attr("class", "myYaxis")
var scatterplot_yAxisLabel = scatterplot_svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - scatterplot_margin.left)
    .attr("x", 0 - (scatterplot_height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")


var scatterplot_boolean_mouseover = false;

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


//Read the data
Promise.all([
    d3.tsv(globalVariable.data_file)
]).then(
    function (files) {
        var data = files[0];
        function update(scatterplot_var1, scatterplot_var2) {

            // Add a tooltip div. Here I define the general feature of the tooltip: stuff that do not depend on the data point.
            // Its opacity is set to 0: we don't see it by default.
            var scatterplot_tooltip = d3.select("body")
                .append("div2")
                .attr("class", "tooltip")
                .style("opacity", 0)


            // Add X axis
            scatterplot_x.domain([0, d3.max(data, function (d) { return +d[scatterplot_var1] }) + 0.05]);
            scatterplot_xAxis.transition().duration(1000).call(d3.axisBottom(scatterplot_x))

            scatterplot_xAxisLabel
                .transition().duration(1000)
                .text(getLabel(scatterplot_var1));

            // Add Y axis
            scatterplot_y.domain([0, d3.max(data, function (d) { return +d[scatterplot_var2] }) + 0.05]);
            scatterplot_yAxis.transition().duration(1000).call(d3.axisLeft(scatterplot_y));

            scatterplot_yAxisLabel
                .transition().duration(1000)
                .text(getLabel(scatterplot_var2));

            // A function that change this tooltip when the user hover a point.
            // Its opacity is set to 1: we can now see it. Plus it set the text and position of tooltip depending on the datapoint (d)
            var scatterplot_mouseover = function (d) {
                scatterplot_tooltip
                    .style("opacity", 1)
                d3.select(this).style("fill", "red")
                scatterplot_boolean_mouseover = true;
                scatterplot_mousemove;
            }

            // A function that change this tooltip when the leaves a point: just need to set opacity to 0 again
            var scatterplot_mouseleave = function (d) {
                scatterplot_tooltip
                    .transition()
                    .duration(200)
                    .style("opacity", 0)
                if (scatterplot_boolean_mouseover == true) {
                    d3.select(this).style("fill", "#69b3a2");
                    scatterplot_boolean_mouseover = false;
                }
            }

            var scatterplot_mousemove = function (d) {
                scatterplot_tooltip
                    .html("The genes in this model are: " + d.Genes + "<br>Model: " + d.Set_of_parameters_modelNumber +
                        "<br>C value: " + d.C_Value + "&nbsp Sigma value: " + d.Sigma_Value +
                        "<br>Misclassification score: " + d.Misclass + "&nbsp Misclassification Error: " + d.Misclass_Error +
                        "<br>LogLoss: " + d.LogLoss + "&nbsp Logloss Error: " + d.LogLoss_Error +
                        "<br>Goodness of fit: " + d.GOF + "&nbsp Goodness of Fit Error: " + d.GOF_Error +
                        "<br>Accuracy of sensitive predictions: " + d.Accuracy0 + "&nbsp Accuracy Error: " + d.Accuracy0_err +
                        "<br>Accuracy of resistant predictions: " + d.Accuracy1 + "&nbsp Accuracy Error: " + d.Accuracy1_err +
                        "<br>MCC: " + d.MCC)
                    //.style("left", ("500px")) // It is important to put the +90: other wise the tooltip is exactly where the point is an it creates a weird effect
                    .style("top", (d3.event.pageY) + "px")
            }

            // Add dots

            var u = scatterplot_svg.selectAll("circle")
            u.remove()

            var u = scatterplot_svg.selectAll("circle")
                .data(data)
                .enter()
                .filter(function (d, i) { return i < 100 }) // the .filter part is just to keep a few dots on the chart, not all of them

            u
                .append("circle")
                .merge(u)
                .attr("cx", function (d) { return scatterplot_x(Math.abs(d[scatterplot_var1])); })
                .attr("cy", function (d) { return scatterplot_y(Math.abs(d[scatterplot_var2])); }) //absolute value of y (e.g. if negative MCC)
                .attr("r", 7)
                .style("fill", "#69b3a2")
                .style("opacity", 0.3)
                .style("stroke", "white")
                .on("mouseover", scatterplot_mouseover)
                .on("mousemove", scatterplot_mousemove)
                .on("mouseleave", scatterplot_mouseleave)

        }

        update(document.getElementById("Var 1").value, document.getElementById("Var 2").value)


        d3.select("#button_submit").on("click", function () {
            update(document.getElementById('Var 1').value, document.getElementById('Var 2').value)
        });




    }
)


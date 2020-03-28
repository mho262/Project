var rowLabels = grid.append("g")
.selectAll(".rowLabelg")
.data(models)
.enter()
.filter(function (d, i) {
    return i < num_rows;
})
.append("text")
.text(function (d) { return "Model " + d.list_order; })
.attr("x", 10)
.attr("y", function (d, i) { return i * cell_height; })
.style("text-anchor", "end")
.attr("transform", "translate(-6," + cell_height / 1.5 + ")")
.attr("class", function (d, i) { return "rowLabel mono r" + i; })
.on("mouseover", function (d) {
    div.transition()
        .duration(200)
        .style("opacity", .9);
    div.html("Model id: " + d.Set_of_parameters_modelNumber +
        "<br> C value: " + d.C_Value + "&nbsp Sigma value: " + d.Sigma_Value +
        "<br> MCC: " + d.MCC)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
    console.log(div);
})
.on("mouseout", function (d) {
    div.transition()
        .duration(500)
        .style("opacity", 0);
});

var col_count = 0;
var sortBy = "MCC";
var row = grid.selectAll(".row")
.data(gridData)
.enter().append("g")
.attr("class", "row");

var column = row.selectAll(".square")
.data(function (d) { col_count = d.length; return d; })
.enter()
.append("rect")
.attr("class", "square")
.attr("x", function (d) { return d.x; })
.attr("y", function (d) { return d.y; })
.attr("width", function (d) { return d.width; })
.attr("height", function (d) { return d.height; })
.style("fill", "#fff")
.style("stroke", "#222")

var labels = row.selectAll(".label")
.data(function (d) { return d; })
.enter()
.append("text")
.attr("x", function (d) { return d.x; })
.attr("y", function (d) { return d.y; })
.text(function (d) {
    if (d.gene_present == true) {
        return d.label_gene;
    }
})
.style("text-anchor", "middle")
.style("fill", function (d) { return d.text_Colour; })
.style("font-weight", function (d) { return d.text_weight; })
.style("font-family", "Times New Roman")
.attr("transform", "translate(" + cell_width / 2 + ",   15)")
.on("mouseover", function (d) {
    div.transition()
        .duration(200)
        .style("opacity", .9);
    div.html("Gene pathways: " + d.pathways)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
})
.on("mouseout", function (d) {
    div.transition()
        .duration(500)
        .style("opacity", 0);
});

var rowQuantitativeLabels = grid.append("g")
.selectAll(".rowLabelg")
.data(models)
.enter()
.filter(function (d, i) {
    if (i < 10) { console.log(d[sortBy]); }
    return i < num_rows;
})
.append("text")
.text(function (d) {
    var x = d[sortBy];
    return x;
})
.attr("x", (col_count) * cell_width + 20)
.attr("y", function (d) { return models.indexOf(d) * cell_height; })
.style("text-anchor", "beginning")
.attr("transform", "translate(-6," + cell_height / 1.5 + ")");

var axisLabel = grid.append("text")
.text("| MCC |")
.attr("transform", "rotate(90)")
.attr("y", 0 - (col_count + 2) * cell_width)
.attr("x", ((num_rows * cell_height) / 2))
.attr("dy", "1em")
.attr("font-weight", 700)
.style("text-anchor", "middle");
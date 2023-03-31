<template>
  <div class="term">
    <div v-if="terms.bracket" class="bracket open">(</div>

    <div class="termWrapper" v-for="(term, i) in terms" :key="i">
      <div v-if="term.bracket" class="bracket open">(</div>

      <component :options="term.options" :is="term.type" :value="term.value" :term="term" :path="path">
        <template v-for="(slot, j) in term.slots" v-slot:[slot.name] :key="j">
          <Term v-if="term.type !== 'scalar'" :terms="slot.terms" :path="`${path}__slots__${j}__terms__0`"></Term>
        </template>
      </component>

      <div v-if="term.bracket" class="bracket close">)</div>
    </div>

    <div v-if="terms.bracket" class="bracket close">)</div>
  </div>
</template>

<script lang="ts">
import Fraction from "@/components/taskComponents/math/Fraction.vue";
import Power from "@/components/taskComponents/math/Power.vue";
import Scalar from "@/components/taskComponents/math/Scalar.vue";
import BaseOperation from "@/components/taskComponents/math/BaseOperation.vue";
import Radical from "@/components/taskComponents/math/Radical.vue";

export default {
  name: "Term",
  components: {
    Fraction,
    Power,
    Scalar,
    BaseOperation,
    Radical,
  },
  props: {
    terms: [Array, Object],
    path: String,
  },
  setup() {
    return {};
  },
};
</script>

<style scoped>
.term,
.termWrapper {
  display: flex;
}

.bracket {
  font-size: 20px;
}
</style>
